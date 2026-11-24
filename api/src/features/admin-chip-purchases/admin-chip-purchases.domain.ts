import { randomUUID } from 'crypto';
import { Transaction } from 'sequelize';
import {
  AdminChipPriceTier,
  AdminChipPricingSummary,
  AdminChipPurchase,
  AdminChipPurchaseListResult,
  AdminChipPurchaseStatus,
  ChipMovementType,
  DEFAULT_ADMIN_CHIP_PRICE_TIERS,
  ErrorCode,
  User,
  UserRole,
  quoteAdminChipPurchase,
  sortAdminChipTiers
} from 'helper';
import { sequelize } from '../../config/sequelize';
import { AppError } from '../../middleware/error.middleware';
import { writeAudit } from '../../utils/audit';
import { generateAdminChipPurchaseReceiptPdf } from '../../utils/settlement-receipt.utils';
import { usersRepository } from '../users/users.repository';
import { balancesRepository } from '../chips/balances.repository';
import { chipMovementsRepository } from '../chips/chip-movements.repository';
import {
  adminChipPurchasesRepository,
  purchaseMovementKey
} from './admin-chip-purchases.repository';

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const defaultTiers = (): AdminChipPriceTier[] =>
  DEFAULT_ADMIN_CHIP_PRICE_TIERS.map(tier => ({ ...tier }));

/**
 * Compra de fichas de los admins: el owner le carga fichas a un admin a
 * precio diferencial (porcentaje del monto según el tramo de la carga) y
 * genera un comprobante. El pago queda pendiente hasta que el owner confirma
 * que lo recibió.
 */
export class AdminChipPurchasesDomain {
  // ── Admins y precios ─────────────────────────────────────────────────────

  async listAdmins(ownerId: string): Promise<AdminChipPricingSummary[]> {
    await this.assertOwner(ownerId);
    const admins = await this.getOwnerAdmins(ownerId);
    const ids = admins.map(admin => admin.id);

    const [pricing, pending, balances] = await Promise.all([
      adminChipPurchasesRepository.findPricing(ids),
      adminChipPurchasesRepository.pendingByAdmin(ids),
      balancesRepository.findByUserIds(ids)
    ]);
    const balanceById = new Map(balances.map(balance => [balance.userId, balance.chipBalance]));

    return admins.map(admin => {
      const custom = pricing.get(admin.id);
      const adminPending = pending.get(admin.id);
      return {
        adminId: admin.id,
        username: admin.username,
        firstName: admin.firstName ?? null,
        lastName: admin.lastName ?? null,
        chipBalance: balanceById.get(admin.id) ?? 0,
        tiers: sortAdminChipTiers(custom ?? defaultTiers()),
        customTiers: Boolean(custom),
        pendingAmount: roundMoney(adminPending?.amount ?? 0),
        pendingCount: adminPending?.count ?? 0
      };
    });
  }

  async updatePricing(
    ownerId: string,
    adminId: string,
    tiers: AdminChipPriceTier[]
  ): Promise<AdminChipPriceTier[]> {
    await this.assertOwner(ownerId);
    await this.getOwnerAdmin(ownerId, adminId);

    const sorted = sortAdminChipTiers(
      tiers.map(tier => ({ minChips: roundMoney(tier.minChips), percentage: roundMoney(tier.percentage) }))
    );
    const previous = (await adminChipPurchasesRepository.findPricing([adminId])).get(adminId) ?? null;
    await adminChipPurchasesRepository.upsertPricing(adminId, sorted, ownerId);

    writeAudit({
      requesterId: ownerId,
      action: 'admin-chip-purchases.pricing.update',
      entityType: 'user',
      entityId: adminId,
      oldValues: { tiers: previous },
      newValues: { tiers: sorted }
    });
    return sorted;
  }

  /** Vuelve a los tramos por defecto. */
  async resetPricing(ownerId: string, adminId: string): Promise<AdminChipPriceTier[]> {
    await this.assertOwner(ownerId);
    await this.getOwnerAdmin(ownerId, adminId);
    await adminChipPurchasesRepository.deletePricing(adminId);

    writeAudit({
      requesterId: ownerId,
      action: 'admin-chip-purchases.pricing.reset',
      entityType: 'user',
      entityId: adminId
    });
    return defaultTiers();
  }

  // ── Compras ──────────────────────────────────────────────────────────────

  async createPurchase(
    ownerId: string,
    data: {
      adminId: string;
      chips: number;
      percentage?: number;
      notes?: string;
      idempotencyKey?: string;
    }
  ): Promise<AdminChipPurchase> {
    await this.assertOwner(ownerId);
    const admin = await this.getOwnerAdmin(ownerId, data.adminId);

    const chips = roundMoney(data.chips);
    if (chips <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'La cantidad de fichas debe ser positiva');
    }

    // Reintento del mismo pedido: devolver la compra ya creada.
    const loadKey = data.idempotencyKey ? `admin-purchase-request:${data.idempotencyKey}` : null;
    if (loadKey) {
      const existing = await chipMovementsRepository.findByIdempotencyKey(loadKey);
      if (existing) {
        const purchase = await adminChipPurchasesRepository.findByChipMovementId(existing.id);
        if (purchase) return purchase;
      }
    }

    const tiers =
      (await adminChipPurchasesRepository.findPricing([admin.id])).get(admin.id) ?? defaultTiers();
    const quote = quoteAdminChipPurchase(tiers, chips, data.percentage);
    if (quote.percentage === null || quote.amount === null) {
      const first = sortAdminChipTiers(tiers)[0];
      throw new AppError(
        400,
        ErrorCode.INVALID_INPUT,
        `La carga es menor a ${first?.minChips ?? 0} fichas: indicá el porcentaje a mano.`
      );
    }

    const purchaseId = randomUUID();
    const purchase = await sequelize.transaction(async (t: Transaction) => {
      const balance = await balancesRepository.findByUserIdWithLock(admin.id, t);
      if (!balance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin balance not found');
      }

      const movement = await chipMovementsRepository.create(
        {
          userId: admin.id,
          relatedUserId: ownerId,
          type: ChipMovementType.SELL_TO_PLAYER,
          amount: chips,
          description: `Compra de fichas al ${quote.percentage}%`,
          previousBalance: balance.chipBalance,
          newBalance: roundMoney(balance.chipBalance + chips),
          idempotencyKey: loadKey ?? purchaseMovementKey(purchaseId, 'load')
        },
        t
      );
      await balancesRepository.atomicIncrement(admin.id, chips, t);

      return adminChipPurchasesRepository.create(
        {
          id: purchaseId,
          adminId: admin.id,
          chips,
          percentage: quote.percentage!,
          amount: quote.amount!,
          manualPercentage: quote.requiresManualPercentage,
          chipMovementId: movement.id,
          notes: data.notes?.trim() || null,
          createdBy: ownerId
        },
        t
      );
    });

    writeAudit({
      requesterId: ownerId,
      action: 'admin-chip-purchases.create',
      entityType: 'chips',
      entityId: purchase.id,
      newValues: {
        adminId: admin.id,
        chips,
        percentage: purchase.percentage,
        amount: purchase.amount,
        manualPercentage: purchase.manualPercentage,
        receiptNumber: purchase.receiptNumber
      }
    });

    return { ...purchase, adminUsername: admin.username };
  }

  async listPurchases(
    ownerId: string,
    filters: { page?: number; limit?: number; adminId?: string; status?: AdminChipPurchaseStatus }
  ): Promise<AdminChipPurchaseListResult> {
    await this.assertOwner(ownerId);
    const admins = await this.getOwnerAdmins(ownerId);
    const adminIds = admins.map(admin => admin.id);
    if (filters.adminId && !adminIds.includes(filters.adminId)) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin not found');
    }
    return adminChipPurchasesRepository.list({ ...filters, adminIds });
  }

  /** Confirma que el admin pagó la compra. */
  async confirmPayment(
    ownerId: string,
    purchaseId: string,
    data: { paymentReference?: string }
  ): Promise<AdminChipPurchase> {
    await this.assertOwner(ownerId);
    const current = await this.getOwnerPurchase(ownerId, purchaseId);

    const updated = await sequelize.transaction(async (t: Transaction) => {
      const purchase = await adminChipPurchasesRepository.findById(purchaseId, t);
      if (!purchase || purchase.status !== AdminChipPurchaseStatus.PENDING) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La compra no tiene un pago pendiente');
      }
      return adminChipPurchasesRepository.update(
        purchaseId,
        {
          status: AdminChipPurchaseStatus.PAID,
          confirmedBy: ownerId,
          confirmedAt: new Date(),
          paymentReference: data.paymentReference?.trim() || purchase.paymentReference || null
        },
        t
      );
    });

    writeAudit({
      requesterId: ownerId,
      action: 'admin-chip-purchases.confirm',
      entityType: 'chips',
      entityId: purchaseId,
      oldValues: { status: current.status },
      newValues: { status: updated.status, paymentReference: updated.paymentReference }
    });
    return updated;
  }

  /**
   * Anula una compra con el pago pendiente: se le retiran las fichas al admin
   * (tiene que tenerlas todavía).
   */
  async cancelPurchase(ownerId: string, purchaseId: string, reason?: string): Promise<AdminChipPurchase> {
    await this.assertOwner(ownerId);
    const current = await this.getOwnerPurchase(ownerId, purchaseId);

    const updated = await sequelize.transaction(async (t: Transaction) => {
      const balance = await balancesRepository.findByUserIdWithLock(current.adminId, t);
      const purchase = await adminChipPurchasesRepository.findById(purchaseId, t);
      if (!purchase || purchase.status !== AdminChipPurchaseStatus.PENDING) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Solo se puede anular una compra con el pago pendiente');
      }
      if (!balance || balance.chipBalance < purchase.chips) {
        throw new AppError(
          400,
          ErrorCode.INSUFFICIENT_BALANCE,
          `El admin ya no tiene las ${purchase.chips} fichas de la compra para retirárselas.`
        );
      }

      await chipMovementsRepository.create(
        {
          userId: purchase.adminId,
          relatedUserId: ownerId,
          type: ChipMovementType.ADJUSTMENT,
          amount: -purchase.chips,
          description: `Anulación de compra de fichas N. ${purchase.receiptNumber}`,
          previousBalance: balance.chipBalance,
          newBalance: roundMoney(balance.chipBalance - purchase.chips),
          idempotencyKey: purchaseMovementKey(purchase.id, 'reversal')
        },
        t
      );
      await balancesRepository.atomicIncrement(purchase.adminId, -purchase.chips, t);

      const cancelNote = reason?.trim() ? `[Anulada] ${reason.trim()}` : null;
      return adminChipPurchasesRepository.update(
        purchaseId,
        {
          status: AdminChipPurchaseStatus.CANCELED,
          canceledBy: ownerId,
          canceledAt: new Date(),
          notes: [purchase.notes, cancelNote].filter(Boolean).join('\n') || null
        },
        t
      );
    });

    writeAudit({
      requesterId: ownerId,
      action: 'admin-chip-purchases.cancel',
      entityType: 'chips',
      entityId: purchaseId,
      oldValues: { status: current.status },
      newValues: { status: updated.status, reason: reason ?? null, chipsReturned: updated.chips }
    });
    return updated;
  }

  async getReceipt(ownerId: string, purchaseId: string) {
    await this.assertOwner(ownerId);
    const purchase = await this.getOwnerPurchase(ownerId, purchaseId);
    return this.buildReceipt(purchase);
  }

  // ── Vista del admin ──────────────────────────────────────────────────────

  async listOwnPurchases(
    adminId: string,
    filters: { page?: number; limit?: number; status?: AdminChipPurchaseStatus }
  ): Promise<AdminChipPurchaseListResult> {
    await this.assertRole(adminId, UserRole.ADMIN);
    return adminChipPurchasesRepository.list({ ...filters, adminId });
  }

  async getOwnReceipt(adminId: string, purchaseId: string) {
    await this.assertRole(adminId, UserRole.ADMIN);
    const purchase = await adminChipPurchasesRepository.findById(purchaseId);
    if (!purchase || purchase.adminId !== adminId) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Purchase not found');
    }
    return this.buildReceipt(purchase);
  }

  // ── Privados ─────────────────────────────────────────────────────────────

  private async buildReceipt(purchase: AdminChipPurchase) {
    const usernames = await adminChipPurchasesRepository.usernames(
      [purchase.adminId, purchase.createdBy].filter((id): id is string => Boolean(id))
    );
    const adminUsername = usernames.get(purchase.adminId) ?? '';
    const buffer = generateAdminChipPurchaseReceiptPdf({
      ...purchase,
      adminUsername,
      ownerUsername: (purchase.createdBy && usernames.get(purchase.createdBy)) || 'owner'
    });
    return {
      buffer,
      filename: `compra-fichas-${String(purchase.receiptNumber).padStart(6, '0')}-${adminUsername.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`
    };
  }

  private async assertRole(userId: string, role: UserRole): Promise<User> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }
    if (user.role !== role) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
    return user;
  }

  private assertOwner(userId: string): Promise<User> {
    return this.assertRole(userId, UserRole.OWNER);
  }

  private async getOwnerAdmins(ownerId: string): Promise<User[]> {
    const descendants = await usersRepository.findDescendants(ownerId);
    return descendants
      .filter(user => user.role === UserRole.ADMIN)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  private async getOwnerAdmin(ownerId: string, adminId: string): Promise<User> {
    const admin = await usersRepository.findById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin not found');
    }
    if (!(await usersRepository.isDescendant(ownerId, adminId))) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Admin is not in your hierarchy');
    }
    return admin;
  }

  private async getOwnerPurchase(ownerId: string, purchaseId: string): Promise<AdminChipPurchase> {
    const purchase = await adminChipPurchasesRepository.findById(purchaseId);
    if (!purchase) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Purchase not found');
    }
    await this.getOwnerAdmin(ownerId, purchase.adminId);
    return purchase;
  }
}

export const adminChipPurchasesDomain = new AdminChipPurchasesDomain();
