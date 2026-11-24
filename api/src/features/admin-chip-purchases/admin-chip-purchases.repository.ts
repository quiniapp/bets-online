import { Op, QueryTypes, Transaction, WhereOptions } from 'sequelize';
import {
  AdminChipPriceTier,
  AdminChipPurchase,
  AdminChipPurchaseStatus,
  AdminChipPurchaseTotals
} from 'helper';
import { sequelize } from '../../config/sequelize';
import { AdminChipPurchaseModel } from './admin-chip-purchase.model';
import { AdminChipPricingModel } from './admin-chip-pricing.model';

const toNumber = (value: unknown): number => parseFloat(String(value ?? 0)) || 0;

/** idempotency_key de los movimientos de fichas de una compra. */
export const purchaseMovementKey = (purchaseId: string, suffix: 'load' | 'reversal'): string =>
  `admin-purchase:${purchaseId}:${suffix}`;

export interface PurchaseListFilters {
  adminIds?: string[];
  adminId?: string;
  status?: AdminChipPurchaseStatus;
  page?: number;
  limit?: number;
}

export class AdminChipPurchasesRepository {
  // ── Precios ──────────────────────────────────────────────────────────────

  async findPricing(adminIds: string[]): Promise<Map<string, AdminChipPriceTier[]>> {
    if (adminIds.length === 0) return new Map();
    const rows = await AdminChipPricingModel.findAll({ where: { adminId: { [Op.in]: adminIds } } });
    return new Map(rows.map(row => [row.adminId, this.mapTiers(row.tiers)]));
  }

  async upsertPricing(adminId: string, tiers: AdminChipPriceTier[], updatedBy: string): Promise<void> {
    await AdminChipPricingModel.upsert({ adminId, tiers, updatedBy });
  }

  async deletePricing(adminId: string): Promise<void> {
    await AdminChipPricingModel.destroy({ where: { adminId } });
  }

  // ── Compras ──────────────────────────────────────────────────────────────

  async create(
    data: {
      id: string;
      adminId: string;
      chips: number;
      percentage: number;
      amount: number;
      manualPercentage: boolean;
      chipMovementId: string;
      notes: string | null;
      createdBy: string;
    },
    transaction: Transaction
  ): Promise<AdminChipPurchase> {
    const row = await AdminChipPurchaseModel.create(
      { ...data, status: AdminChipPurchaseStatus.PENDING },
      { transaction }
    );
    // receipt_number lo asigna la base (SERIAL).
    await row.reload({ transaction });
    return this.map(row);
  }

  async findById(id: string, transaction?: Transaction): Promise<AdminChipPurchase | null> {
    const row = await AdminChipPurchaseModel.findByPk(id, {
      transaction,
      lock: transaction ? Transaction.LOCK.UPDATE : undefined
    });
    return row ? this.map(row) : null;
  }

  async findByChipMovementId(chipMovementId: string): Promise<AdminChipPurchase | null> {
    const row = await AdminChipPurchaseModel.findOne({ where: { chipMovementId } });
    return row ? this.map(row) : null;
  }

  async update(
    id: string,
    data: Partial<{
      status: AdminChipPurchaseStatus;
      paymentReference: string | null;
      notes: string | null;
      confirmedBy: string | null;
      confirmedAt: Date | null;
      canceledBy: string | null;
      canceledAt: Date | null;
    }>,
    transaction?: Transaction
  ): Promise<AdminChipPurchase> {
    await AdminChipPurchaseModel.update(data, { where: { id }, transaction });
    const row = await AdminChipPurchaseModel.findByPk(id, { transaction });
    return this.map(row!);
  }

  async list(filters: PurchaseListFilters): Promise<{
    purchases: AdminChipPurchase[];
    total: number;
    totals: AdminChipPurchaseTotals;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = this.buildWhere(filters);

    const [{ rows, count }, totals] = await Promise.all([
      AdminChipPurchaseModel.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        offset: (page - 1) * limit,
        limit
      }),
      this.totals(filters)
    ]);

    const usernames = await this.usernames(rows.map(row => row.adminId));
    return {
      purchases: rows.map(row => ({ ...this.map(row), adminUsername: usernames.get(row.adminId) ?? '' })),
      total: count,
      totals,
      page,
      limit
    };
  }

  /** Deuda pendiente por admin. */
  async pendingByAdmin(adminIds: string[]): Promise<Map<string, { amount: number; count: number }>> {
    if (adminIds.length === 0) return new Map();
    const rows = await sequelize.query<{ admin_id: string; amount: string; count: string }>(
      `SELECT admin_id, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
         FROM admin_chip_purchases
        WHERE admin_id IN (:adminIds) AND status = :status
        GROUP BY admin_id`,
      {
        replacements: { adminIds, status: AdminChipPurchaseStatus.PENDING },
        type: QueryTypes.SELECT
      }
    );
    return new Map(rows.map(row => [row.admin_id, { amount: toNumber(row.amount), count: toNumber(row.count) }]));
  }

  async usernames(userIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map();
    const rows = await sequelize.query<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE id IN (:ids)',
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
    return new Map(rows.map(row => [row.id, row.username]));
  }

  private async totals(filters: PurchaseListFilters): Promise<AdminChipPurchaseTotals> {
    const rows = await AdminChipPurchaseModel.findAll({
      where: this.buildWhere({ ...filters, status: undefined }),
      attributes: [
        'status',
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('chips')), 0), 'chips'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'amount']
      ],
      group: ['status'],
      raw: true
    }) as unknown as Array<{ status: AdminChipPurchaseStatus; chips: string; amount: string }>;

    const totals: AdminChipPurchaseTotals = { chips: 0, amount: 0, paidAmount: 0, pendingAmount: 0 };
    for (const row of rows) {
      if (filters.status && row.status !== filters.status) continue;
      if (row.status === AdminChipPurchaseStatus.CANCELED) continue;
      totals.chips += toNumber(row.chips);
      totals.amount += toNumber(row.amount);
      if (row.status === AdminChipPurchaseStatus.PAID) totals.paidAmount += toNumber(row.amount);
      if (row.status === AdminChipPurchaseStatus.PENDING) totals.pendingAmount += toNumber(row.amount);
    }
    return totals;
  }

  private buildWhere(filters: PurchaseListFilters): WhereOptions {
    const where: Record<string | symbol, unknown> = {};
    if (filters.adminId) where.adminId = filters.adminId;
    else if (filters.adminIds) where.adminId = { [Op.in]: filters.adminIds };
    if (filters.status) where.status = filters.status;
    return where as WhereOptions;
  }

  private mapTiers(tiers: unknown): AdminChipPriceTier[] {
    if (!Array.isArray(tiers)) return [];
    return tiers.map(tier => ({
      minChips: toNumber((tier as AdminChipPriceTier).minChips),
      percentage: toNumber((tier as AdminChipPriceTier).percentage)
    }));
  }

  private map(row: AdminChipPurchaseModel): AdminChipPurchase {
    const plain = row.get({ plain: true }) as AdminChipPurchaseModel;
    return {
      id: plain.id,
      receiptNumber: Number(plain.receiptNumber),
      adminId: plain.adminId,
      chips: toNumber(plain.chips),
      percentage: toNumber(plain.percentage),
      amount: toNumber(plain.amount),
      manualPercentage: Boolean(plain.manualPercentage),
      status: plain.status,
      paymentReference: plain.paymentReference ?? null,
      notes: plain.notes ?? null,
      createdBy: plain.createdBy ?? null,
      confirmedBy: plain.confirmedBy ?? null,
      confirmedAt: plain.confirmedAt ? new Date(plain.confirmedAt) : null,
      canceledBy: plain.canceledBy ?? null,
      canceledAt: plain.canceledAt ? new Date(plain.canceledAt) : null,
      createdAt: new Date(plain.createdAt)
    };
  }
}

export const adminChipPurchasesRepository = new AdminChipPurchasesRepository();
