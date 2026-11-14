import {
  CashierAccountMovement,
  CashierAccountSummary,
  CashierCompensationMode,
  CashierSettlement,
  CashierSettlementPreview,
  CompensationType,
  ErrorCode,
  SettlementStatus,
  User,
  UserRole
} from 'helper';
import { usersRepository } from '../users/users.repository';
import { balancesRepository } from '../chips/balances.repository';
import {
  cashierAccountsRepository,
  MovementTotals
} from './cashier-accounts.repository';
import { AppError } from '../../middleware/error.middleware';
import { writeAudit } from '../../utils/audit';

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export class CashierAccountsDomain {
  async listAccounts(
    requesterId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    await this.assertOwner(requesterId);

    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const search = (options.search ?? '').trim().toLowerCase();

    const cashiers = await this.getOwnerCashiers(requesterId);
    const filtered = search
      ? cashiers.filter(cashier => this.matchesSearch(cashier, search))
      : cashiers;

    const summaries = await this.buildSummaries(filtered);
    const total = summaries.length;
    const accounts = summaries.slice((page - 1) * limit, page * limit);

    const summary = summaries.reduce(
      (acc, account) => ({
        totalCashiers: acc.totalCashiers + 1,
        totalSales: roundMoney(acc.totalSales + account.totalSales),
        totalPrizes: roundMoney(acc.totalPrizes + account.totalPrizes),
        totalProfit: roundMoney(acc.totalProfit + account.profit),
        pendingAmount: roundMoney(acc.pendingAmount + account.pendingAmount),
        paidAmount: roundMoney(acc.paidAmount + account.paidAmount),
        openCommission: roundMoney(acc.openCommission + account.openCommission),
        balanceDue: roundMoney(acc.balanceDue + account.balanceDue)
      }),
      {
        totalCashiers: 0,
        totalSales: 0,
        totalPrizes: 0,
        totalProfit: 0,
        pendingAmount: 0,
        paidAmount: 0,
        openCommission: 0,
        balanceDue: 0
      }
    );

    return { accounts, summary, total, page, limit };
  }

  async getAccount(requesterId: string, cashierId: string) {
    await this.assertOwner(requesterId);
    const cashier = await this.getCashierInOwnerTree(requesterId, cashierId);

    const [summary] = await this.buildSummaries([cashier]);
    const settlements = await cashierAccountsRepository.findSettlementsForCashier(cashierId);
    const movements = await cashierAccountsRepository.findRecentAccountMovements(cashierId, 50);

    return {
      account: summary,
      settlements,
      movements: movements as CashierAccountMovement[]
    };
  }

  async updateCompensation(
    requesterId: string,
    cashierId: string,
    data: { type: CompensationType; percentage: number }
  ) {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);

    const now = new Date();
    // Crear primero y cerrar después: si el cierre fallara, la nueva modalidad
    // ya quedó activa y nunca se pierde la configuración vigente.
    const mode = await cashierAccountsRepository.createCompensationMode({
      cashierId,
      type: data.type,
      percentage: roundMoney(data.percentage),
      activeFrom: now
    });
    await cashierAccountsRepository.closeActiveCompensationModes(cashierId, now);

    writeAudit({
      requesterId,
      action: 'cashier-accounts.compensation.update',
      entityType: 'user',
      entityId: cashierId,
      newValues: { type: data.type, percentage: data.percentage, activeFrom: now }
    });

    return mode;
  }

  async previewSettlement(
    requesterId: string,
    cashierId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CashierSettlementPreview> {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);
    this.assertValidPeriod(periodStart, periodEnd);

    const compensation = await cashierAccountsRepository.findCompensationModeForPeriod(
      cashierId,
      periodStart,
      periodEnd
    );
    const totals = await cashierAccountsRepository.getMovementTotalsForPeriod(
      cashierId,
      periodStart,
      periodEnd
    );

    return this.buildPreview(cashierId, periodStart, periodEnd, compensation, totals);
  }

  async createSettlement(
    requesterId: string,
    cashierId: string,
    data: { periodStart: Date; periodEnd: Date; notes?: string }
  ) {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);
    this.assertValidPeriod(data.periodStart, data.periodEnd);

    const overlapping = await cashierAccountsRepository.findOverlappingSettlement(
      cashierId,
      data.periodStart,
      data.periodEnd
    );
    if (overlapping) {
      throw new AppError(
        409,
        ErrorCode.ALREADY_EXISTS,
        'Ya existe una liquidación para ese período. Cancelala antes de crear una nueva.'
      );
    }

    const compensation = await cashierAccountsRepository.findCompensationModeForPeriod(
      cashierId,
      data.periodStart,
      data.periodEnd
    );
    if (!compensation) {
      throw new AppError(
        400,
        ErrorCode.INVALID_INPUT,
        'El cajero no tiene una modalidad de comisión configurada para ese período'
      );
    }

    const totals = await cashierAccountsRepository.getMovementTotalsForPeriod(
      cashierId,
      data.periodStart,
      data.periodEnd
    );
    const preview = this.buildPreview(
      cashierId,
      data.periodStart,
      data.periodEnd,
      compensation,
      totals
    );

    const settlement = await cashierAccountsRepository.createSettlement({
      cashierId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalSales: preview.totalSales,
      totalPrizesPaid: preview.totalPrizes,
      profit: preview.profit,
      payableAmount: preview.payableAmount,
      compensationType: compensation.type,
      percentage: compensation.percentage,
      notes: data.notes,
      createdBy: requesterId
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.create',
      entityType: 'chips',
      entityId: settlement.id,
      newValues: {
        cashierId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalSales: preview.totalSales,
        totalPrizes: preview.totalPrizes,
        payableAmount: preview.payableAmount
      }
    });

    return settlement;
  }

  async listSettlements(
    requesterId: string,
    filters: {
      page?: number;
      limit?: number;
      cashierId?: string;
      status?: SettlementStatus;
      search?: string;
    } = {}
  ) {
    await this.assertOwner(requesterId);
    const cashiers = await this.getOwnerCashiers(requesterId);
    const cashierIds = cashiers.map(cashier => cashier.id);

    if (filters.cashierId && !cashierIds.includes(filters.cashierId)) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier not found');
    }

    return cashierAccountsRepository.findSettlements({
      cashierIds,
      cashierId: filters.cashierId,
      status: filters.status,
      search: filters.search?.trim() || undefined,
      page: filters.page,
      limit: filters.limit
    });
  }

  async paySettlement(
    requesterId: string,
    settlementId: string,
    data: { paymentReference?: string; notes?: string }
  ) {
    await this.assertOwner(requesterId);
    const settlement = await this.getSettlementInOwnerTree(requesterId, settlementId);

    if (settlement.status === SettlementStatus.PAID) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación ya está pagada');
    }
    if (settlement.status === SettlementStatus.CANCELED) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'No se puede pagar una liquidación cancelada');
    }

    const paymentNote = data.notes?.trim()
      ? `[Pago] ${data.notes.trim()}`
      : null;
    const notes = [settlement.notes, paymentNote].filter(Boolean).join('\n') || undefined;

    const paid = await cashierAccountsRepository.markSettlementPaid(settlementId, {
      paidBy: requesterId,
      paymentReference: data.paymentReference?.trim() || undefined,
      notes
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.pay',
      entityType: 'chips',
      entityId: settlementId,
      oldValues: { status: settlement.status },
      newValues: {
        status: paid.status,
        paidAt: paid.paidAt,
        paymentReference: paid.paymentReference
      }
    });

    return paid;
  }

  async cancelSettlement(requesterId: string, settlementId: string, reason?: string) {
    await this.assertOwner(requesterId);
    const settlement = await this.getSettlementInOwnerTree(requesterId, settlementId);

    if (settlement.status === SettlementStatus.PAID) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'No se puede cancelar una liquidación pagada');
    }
    if (settlement.status === SettlementStatus.CANCELED) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación ya está cancelada');
    }

    const cancelNote = reason?.trim() ? `[Cancelada] ${reason.trim()}` : null;
    const notes = [settlement.notes, cancelNote].filter(Boolean).join('\n') || undefined;
    const canceled = await cashierAccountsRepository.markSettlementCanceled(
      settlementId,
      notes
    );

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.cancel',
      entityType: 'chips',
      entityId: settlementId,
      oldValues: { status: settlement.status },
      newValues: { status: canceled.status, reason: reason ?? null }
    });

    return canceled;
  }

  private async buildSummaries(cashiers: User[]): Promise<CashierAccountSummary[]> {
    if (cashiers.length === 0) return [];
    const ids = cashiers.map(cashier => cashier.id);

    const [modes, settlements, totals, balances] = await Promise.all([
      cashierAccountsRepository.findCompensationModes(ids),
      cashierAccountsRepository.findNonCanceledSettlements(ids),
      cashierAccountsRepository.getMovementTotals(ids),
      balancesRepository.findByUserIds(ids)
    ]);

    const now = new Date();
    const balanceByCashier = new Map(balances.map(balance => [balance.userId, balance.chipBalance]));
    const modesByCashier = this.groupByCashier(mode => mode.cashierId, modes);
    const settlementsByCashier = this.groupByCashier(settlement => settlement.cashierId, settlements);

    return cashiers.map(cashier => {
      const cashierModes = modesByCashier.get(cashier.id) ?? [];
      const activeMode = cashierModes.find(mode =>
        mode.activeFrom <= now && (!mode.activeTo || mode.activeTo > now)
      ) ?? null;
      const cashierSettlements = settlementsByCashier.get(cashier.id) ?? [];
      const movementTotals = totals.get(cashier.id) ?? { totalSales: 0, totalPrizes: 0 };

      const totalSales = roundMoney(movementTotals.totalSales);
      const totalPrizes = roundMoney(movementTotals.totalPrizes);
      const profit = roundMoney(totalSales - totalPrizes);

      const settledSales = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + settlement.totalSales, 0)
      );
      const settledPrizes = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + settlement.totalPrizesPaid, 0)
      );
      const openSales = roundMoney(Math.max(0, totalSales - settledSales));
      const openPrizes = roundMoney(Math.max(0, totalPrizes - settledPrizes));
      const openProfit = roundMoney(openSales - openPrizes);
      const openCommission = this.calculatePayable(
        openProfit,
        activeMode?.percentage ?? null
      );

      const pendingAmount = roundMoney(
        cashierSettlements
          .filter(settlement => settlement.status === SettlementStatus.PENDING)
          .reduce((sum, settlement) => sum + settlement.payableAmount, 0)
      );
      const paidAmount = roundMoney(
        cashierSettlements
          .filter(settlement => settlement.status === SettlementStatus.PAID)
          .reduce((sum, settlement) => sum + settlement.payableAmount, 0)
      );
      const lastSettlementAt = cashierSettlements.reduce<Date | null>(
        (latest, settlement) =>
          !latest || settlement.createdAt > latest ? settlement.createdAt : latest,
        null
      );
      const lastPaidAt = cashierSettlements.reduce<Date | null>(
        (latest, settlement) =>
          settlement.status === SettlementStatus.PAID && settlement.paidAt &&
          (!latest || settlement.paidAt > latest)
            ? settlement.paidAt
            : latest,
        null
      );

      return {
        cashierId: cashier.id,
        username: cashier.username,
        email: cashier.email,
        firstName: cashier.firstName,
        lastName: cashier.lastName,
        status: cashier.status,
        chipBalance: balanceByCashier.get(cashier.id) ?? 0,
        compensation: activeMode
          ? {
              type: activeMode.type,
              percentage: activeMode.percentage,
              activeFrom: activeMode.activeFrom
            }
          : null,
        totalSales,
        totalPrizes,
        profit,
        pendingAmount,
        paidAmount,
        openProfit,
        openCommission,
        balanceDue: roundMoney(pendingAmount + openCommission),
        lastSettlementAt,
        lastPaidAt
      };
    }).sort((a, b) => a.username.localeCompare(b.username));
  }

  private buildPreview(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date,
    compensation: CashierCompensationMode | null,
    totals: MovementTotals
  ): CashierSettlementPreview {
    const totalSales = roundMoney(totals.totalSales);
    const totalPrizes = roundMoney(totals.totalPrizes);
    const profit = roundMoney(totalSales - totalPrizes);
    const payableAmount = this.calculatePayable(profit, compensation?.percentage ?? null);

    return {
      cashierId,
      periodStart,
      periodEnd,
      compensation: compensation
        ? {
            type: compensation.type,
            percentage: compensation.percentage,
            activeFrom: compensation.activeFrom
          }
        : null,
      totalSales,
      totalPrizes,
      profit,
      payableAmount
    };
  }

  private calculatePayable(profit: number, percentage: number | null | undefined): number {
    if (!percentage || percentage <= 0 || profit <= 0) return 0;
    return roundMoney((profit * percentage) / 100);
  }

  private assertValidPeriod(periodStart: Date, periodEnd: Date): void {
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Invalid period dates');
    }
    if (periodEnd <= periodStart) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Period end must be after period start');
    }
  }

  private async assertOwner(requesterId: string): Promise<User> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }
    if (requester.role !== UserRole.OWNER) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Solo el propietario puede gestionar las cuentas de cajeros'
      );
    }
    return requester;
  }

  private async getOwnerCashiers(ownerId: string): Promise<User[]> {
    const descendants = await usersRepository.findDescendants(ownerId);
    return descendants
      .filter(user => user.role === UserRole.CASHIER)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  private async getCashierInOwnerTree(ownerId: string, cashierId: string): Promise<User> {
    const cashier = await usersRepository.findById(cashierId);
    if (!cashier || cashier.role !== UserRole.CASHIER) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier not found');
    }

    const inTree = await usersRepository.isDescendant(ownerId, cashierId);
    if (!inTree) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Cashier is not in your hierarchy');
    }
    return cashier;
  }

  private async getSettlementInOwnerTree(
    ownerId: string,
    settlementId: string
  ): Promise<CashierSettlement> {
    const settlement = await cashierAccountsRepository.findSettlementById(settlementId);
    if (!settlement) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Settlement not found');
    }
    await this.getCashierInOwnerTree(ownerId, settlement.cashierId);
    return settlement;
  }

  private matchesSearch(cashier: User, search: string): boolean {
    return [
      cashier.username,
      cashier.email,
      cashier.firstName,
      cashier.lastName
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(search));
  }

  private groupByCashier<T>(key: (item: T) => string, items: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const cashierId = key(item);
      const group = map.get(cashierId);
      if (group) group.push(item);
      else map.set(cashierId, [item]);
    }
    return map;
  }
}

export const cashierAccountsDomain = new CashierAccountsDomain();
