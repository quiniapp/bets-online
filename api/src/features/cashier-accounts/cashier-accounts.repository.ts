import { Op, QueryTypes, Transaction } from 'sequelize';
import {
  CashierCollection,
  CashierCompensationMode,
  CashierSettlement,
  ChipMovementType,
  CompensationType,
  SettlementStatus
} from 'helper';
import {
  CashierCollectionModel,
  CashierCompensationModeModel,
  CashierSettlementModel,
  UserModel
} from '../../persistence/models';
import { sequelize } from '../../config/sequelize';

export interface MovementTotals {
  totalSales: number;
  totalPrizes: number;
}

export interface PeriodFlows extends MovementTotals {
  /** Fichas que el owner (o un superior) le cargó al cajero */
  chipsDelivered: number;
}

export interface SettlementListFilters {
  cashierIds?: string[];
  cashierId?: string;
  status?: SettlementStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateSettlementData {
  id: string;
  cashierId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  totalPrizesPaid: number;
  profit: number;
  payableAmount: number;
  status: SettlementStatus;
  compensationType: CompensationType | null;
  percentage: number | null;
  notes?: string | null;
  createdBy: string;
  paidBy?: string | null;
  paidAt?: Date | null;
  paymentReference?: string | null;
  commission: number;
  subtotal: number;
  previousDebt: number;
  totalDue: number;
  collected: number;
  debtCarried: number;
  chipsDelivered: number;
  chipBalanceBefore: number;
  prizeChipsRecovered: number;
  unsoldChips: number;
  chipsLeft: number;
  unsoldChipsRecovered: number;
}

export interface LedgerChipRow {
  id: string;
  user_id: string;
  related_user_id: string | null;
  username: string | null;
  type: ChipMovementType;
  amount: string;
  description: string | null;
  idempotency_key: string | null;
  created_at: Date;
}

/** Prefijo de idempotency_key de los movimientos generados por una liquidación. */
export const settlementMovementKey = (settlementId: string, suffix: string): string =>
  `settlement:${settlementId}:${suffix}`;

const toNumber = (value: unknown): number => parseFloat(String(value ?? 0)) || 0;
const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : parseFloat(String(value));

export class CashierAccountsRepository {
  async findCompensationMode(
    cashierId: string,
    at: Date = new Date()
  ): Promise<CashierCompensationMode | null> {
    const mode = await CashierCompensationModeModel.findOne({
      where: {
        cashierId,
        activeFrom: { [Op.lte]: at },
        [Op.or]: [{ activeTo: null }, { activeTo: { [Op.gt]: at } }]
      },
      order: [['activeFrom', 'DESC']]
    });
    return mode ? this.mapCompensationMode(mode) : null;
  }

  async findCompensationModeForPeriod(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CashierCompensationMode | null> {
    // The mode that was in force when the period closed. This keeps a
    // settlement reproducible even after the owner changes the percentage.
    const mode = await CashierCompensationModeModel.findOne({
      where: {
        cashierId,
        activeFrom: { [Op.lte]: periodEnd },
        [Op.or]: [{ activeTo: null }, { activeTo: { [Op.gte]: periodStart } }]
      },
      order: [['activeFrom', 'DESC']]
    });
    return mode ? this.mapCompensationMode(mode) : null;
  }

  async findCompensationModes(cashierIds: string[]): Promise<CashierCompensationMode[]> {
    if (cashierIds.length === 0) return [];
    const modes = await CashierCompensationModeModel.findAll({
      where: { cashierId: { [Op.in]: cashierIds } },
      order: [['activeFrom', 'DESC']]
    });
    return modes.map(mode => this.mapCompensationMode(mode));
  }

  async closeActiveCompensationModes(cashierId: string, activeTo: Date): Promise<void> {
    await CashierCompensationModeModel.update(
      { activeTo },
      {
        where: {
          cashierId,
          activeTo: null,
          activeFrom: { [Op.lt]: activeTo }
        }
      }
    );
  }

  async createCompensationMode(data: {
    cashierId: string;
    type: CompensationType;
    percentage: number;
    activeFrom: Date;
  }): Promise<CashierCompensationMode> {
    const mode = await CashierCompensationModeModel.create({
      cashierId: data.cashierId,
      type: data.type,
      percentage: data.percentage,
      activeFrom: data.activeFrom
    });
    return this.mapCompensationMode(mode);
  }

  async findNonCanceledSettlements(cashierIds: string[]): Promise<CashierSettlement[]> {
    if (cashierIds.length === 0) return [];
    const settlements = await CashierSettlementModel.findAll({
      where: {
        cashierId: { [Op.in]: cashierIds },
        status: { [Op.ne]: SettlementStatus.CANCELED }
      },
      order: [['periodEnd', 'DESC'], ['createdAt', 'DESC']]
    });
    return settlements.map(settlement => this.mapSettlement(settlement));
  }

  async findSettlementsForCashier(cashierId: string): Promise<CashierSettlement[]> {
    const settlements = await CashierSettlementModel.findAll({
      where: { cashierId },
      order: [['periodEnd', 'DESC'], ['createdAt', 'DESC']]
    });
    return settlements.map(settlement => this.mapSettlement(settlement));
  }

  async findSettlementById(
    id: string,
    transaction?: Transaction
  ): Promise<CashierSettlement | null> {
    const settlement = await CashierSettlementModel.findByPk(id, {
      transaction,
      lock: transaction ? true : undefined
    });
    return settlement ? this.mapSettlement(settlement) : null;
  }

  /**
   * Última liquidación no cancelada del cajero (la de período más reciente).
   * Su arrastre es el saldo anterior de la siguiente.
   */
  async findLastSettlement(
    cashierId: string,
    transaction?: Transaction
  ): Promise<CashierSettlement | null> {
    const settlement = await CashierSettlementModel.findOne({
      where: { cashierId, status: { [Op.ne]: SettlementStatus.CANCELED } },
      order: [['periodEnd', 'DESC'], ['createdAt', 'DESC']],
      transaction
    });
    return settlement ? this.mapSettlement(settlement) : null;
  }

  async findOverlappingSettlement(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date,
    transaction?: Transaction
  ): Promise<CashierSettlement | null> {
    const settlement = await CashierSettlementModel.findOne({
      where: {
        cashierId,
        status: { [Op.ne]: SettlementStatus.CANCELED },
        periodStart: { [Op.lt]: periodEnd },
        periodEnd: { [Op.gt]: periodStart }
      },
      transaction
    });
    return settlement ? this.mapSettlement(settlement) : null;
  }

  /**
   * Liquidaciones no canceladas que se superponen con el período, para varios
   * cajeros a la vez (cuenta corriente por período).
   */
  async findSettlementsOverlapping(
    cashierIds: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<CashierSettlement[]> {
    if (cashierIds.length === 0) return [];
    const settlements = await CashierSettlementModel.findAll({
      where: {
        cashierId: { [Op.in]: cashierIds },
        status: { [Op.ne]: SettlementStatus.CANCELED },
        periodStart: { [Op.lt]: periodEnd },
        periodEnd: { [Op.gt]: periodStart }
      },
      order: [['periodEnd', 'DESC']]
    });
    return settlements.map(settlement => this.mapSettlement(settlement));
  }

  /**
   * Liquidaciones no canceladas cuyo período cierra dentro del rango
   * (cuenta del owner).
   */
  async findSettlementsClosedInRange(
    cashierIds: string[],
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<Array<CashierSettlement & { cashierUsername: string }>> {
    if (cashierIds.length === 0) return [];
    const rows = await CashierSettlementModel.findAll({
      where: {
        cashierId: { [Op.in]: cashierIds },
        status: { [Op.ne]: SettlementStatus.CANCELED },
        periodEnd: { [Op.gte]: rangeStart, [Op.lte]: rangeEnd }
      },
      include: [{ model: UserModel, as: 'cashier', attributes: ['id', 'username'] }],
      order: [['periodEnd', 'DESC'], ['createdAt', 'DESC']]
    });
    return rows.map(row => {
      const plain = row.get({ plain: true }) as Record<string, unknown>;
      const cashier = plain.cashier as { username?: string } | undefined;
      return { ...this.mapSettlement(row), cashierUsername: cashier?.username ?? '' };
    });
  }

  async createSettlement(
    data: CreateSettlementData,
    transaction?: Transaction
  ): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.create(
      {
        id: data.id,
        cashierId: data.cashierId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalSales: data.totalSales,
        totalPrizesPaid: data.totalPrizesPaid,
        profit: data.profit,
        payableAmount: data.payableAmount,
        status: data.status,
        compensationType: data.compensationType,
        percentage: data.percentage,
        notes: data.notes || null,
        createdBy: data.createdBy,
        paidBy: data.paidBy ?? null,
        paidAt: data.paidAt ?? null,
        paymentReference: data.paymentReference || null,
        commission: data.commission,
        subtotal: data.subtotal,
        previousDebt: data.previousDebt,
        totalDue: data.totalDue,
        collected: data.collected,
        debtCarried: data.debtCarried,
        chipsDelivered: data.chipsDelivered,
        chipBalanceBefore: data.chipBalanceBefore,
        prizeChipsRecovered: data.prizeChipsRecovered,
        unsoldChips: data.unsoldChips,
        chipsLeft: data.chipsLeft,
        unsoldChipsRecovered: data.unsoldChipsRecovered
      },
      { transaction }
    );
    return this.mapSettlement(settlement);
  }

  async updateSettlementCollection(
    id: string,
    data: {
      collected: number;
      debtCarried: number;
      status: SettlementStatus;
      paidBy?: string | null;
      paidAt?: Date | null;
      paymentReference?: string | null;
      notes?: string | null;
    },
    transaction?: Transaction
  ): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.findByPk(id, { transaction });
    if (!settlement) throw new Error('Settlement not found');

    await settlement.update(
      {
        collected: data.collected,
        debtCarried: data.debtCarried,
        status: data.status,
        paidBy: data.paidBy ?? settlement.paidBy,
        paidAt: data.paidAt ?? settlement.paidAt,
        paymentReference: data.paymentReference ?? settlement.paymentReference,
        notes: data.notes ?? settlement.notes
      },
      { transaction }
    );
    return this.mapSettlement(settlement);
  }

  async markSettlementCanceled(
    id: string,
    notes?: string,
    transaction?: Transaction
  ): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.findByPk(id, { transaction });
    if (!settlement) throw new Error('Settlement not found');

    await settlement.update(
      {
        status: SettlementStatus.CANCELED,
        notes: notes ?? settlement.notes
      },
      { transaction }
    );
    return this.mapSettlement(settlement);
  }

  async createCollection(
    data: {
      settlementId: string;
      cashierId: string;
      amount: number;
      paymentReference?: string | null;
      createdBy: string;
    },
    transaction?: Transaction
  ): Promise<CashierCollection> {
    const collection = await CashierCollectionModel.create(
      {
        settlementId: data.settlementId,
        cashierId: data.cashierId,
        amount: data.amount,
        paymentReference: data.paymentReference || null,
        createdBy: data.createdBy
      },
      { transaction }
    );
    return this.mapCollection(collection);
  }

  async findCollectionsForCashier(cashierId: string, limit = 100): Promise<CashierCollection[]> {
    const rows = await CashierCollectionModel.findAll({
      where: { cashierId },
      order: [['createdAt', 'DESC']],
      limit
    });
    return rows.map(row => this.mapCollection(row));
  }

  /**
   * Cobros registrados en el rango, de liquidaciones no canceladas.
   */
  async findCollectionsInRange(
    cashierIds: string[],
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<CashierCollection[]> {
    if (cashierIds.length === 0) return [];
    const rows = await CashierCollectionModel.findAll({
      where: {
        cashierId: { [Op.in]: cashierIds },
        createdAt: { [Op.gte]: rangeStart, [Op.lte]: rangeEnd }
      },
      include: [
        {
          model: CashierSettlementModel,
          as: 'settlement',
          attributes: ['id', 'status'],
          where: { status: { [Op.ne]: SettlementStatus.CANCELED } },
          required: true
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    return rows.map(row => this.mapCollection(row));
  }

  async getMovementTotals(cashierIds: string[]): Promise<Map<string, MovementTotals>> {
    if (cashierIds.length === 0) return new Map();
    const rows = await this.queryFlows(cashierIds);
    const map = new Map<string, MovementTotals>();
    for (const [cashierId, flows] of rows) {
      map.set(cashierId, { totalSales: flows.totalSales, totalPrizes: flows.totalPrizes });
    }
    return map;
  }

  async getMovementTotalsForPeriod(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MovementTotals> {
    const flows = await this.getPeriodFlows(cashierId, periodStart, periodEnd);
    return { totalSales: flows.totalSales, totalPrizes: flows.totalPrizes };
  }

  /**
   * Venta de fichas, premios y fichas entregadas de un cajero en un período.
   */
  async getPeriodFlows(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date,
    transaction?: Transaction
  ): Promise<PeriodFlows> {
    const rows = await this.queryFlows([cashierId], periodStart, periodEnd, transaction);
    return rows.get(cashierId) ?? { totalSales: 0, totalPrizes: 0, chipsDelivered: 0 };
  }

  /**
   * Movimientos de fichas que forman la cuenta corriente del cajero:
   * los suyos (cargas, retiros, recuperos de liquidación) y los que operó
   * con sus jugadores (ventas, premios, pérdidas, retiros).
   */
  async findLedgerChipMovements(cashierId: string, limit = 100): Promise<LedgerChipRow[]> {
    return sequelize.query<LedgerChipRow>(
      `SELECT cm.id, cm.user_id, cm.related_user_id, cm.type, cm.amount, cm.description,
              cm.idempotency_key, cm.created_at,
              CASE WHEN cm.user_id = :cashierId THEN ru.username ELSE u.username END AS username
         FROM chip_movements cm
         LEFT JOIN users u ON u.id = cm.user_id
         LEFT JOIN users ru ON ru.id = cm.related_user_id
        WHERE (cm.user_id = :cashierId
               AND cm.type IN ('SELL_TO_PLAYER', 'WITHDRAWAL', 'RECOVERY', 'ADJUSTMENT', 'DEPOSIT'))
           OR (cm.related_user_id = :cashierId
               AND cm.user_id <> :cashierId
               AND cm.type IN ('SELL_TO_PLAYER', 'PRIZE', 'LOSS', 'WITHDRAWAL'))
        ORDER BY cm.created_at DESC
        LIMIT :limit`,
      { replacements: { cashierId, limit }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Movimientos de fichas generados por una liquidación (por idempotency_key).
   */
  async findSettlementChipMovements(
    settlementId: string,
    transaction?: Transaction
  ): Promise<Array<{ id: string; userId: string; amount: number; key: string }>> {
    const rows = await sequelize.query<{
      id: string;
      user_id: string;
      amount: string;
      idempotency_key: string;
    }>(
      `SELECT id, user_id, amount, idempotency_key
         FROM chip_movements
        WHERE idempotency_key LIKE :prefix`,
      {
        replacements: { prefix: `${settlementMovementKey(settlementId, '')}%` },
        type: QueryTypes.SELECT,
        transaction
      }
    );
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      amount: toNumber(row.amount),
      key: row.idempotency_key
    }));
  }

  async findSettlements(filters: SettlementListFilters): Promise<{
    settlements: Array<CashierSettlement & { cashierUsername: string }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const where: Record<string | symbol, unknown> = {};
    if (filters.cashierId) {
      where.cashierId = filters.cashierId;
    } else if (filters.cashierIds) {
      if (filters.cashierIds.length === 0) {
        return { settlements: [], total: 0, page, limit };
      }
      where.cashierId = { [Op.in]: filters.cashierIds };
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const cashierWhere = filters.search
      ? { username: { [Op.iLike]: `%${filters.search}%` } }
      : undefined;

    const { count, rows } = await CashierSettlementModel.findAndCountAll({
      where,
      include: [
        {
          model: UserModel,
          as: 'cashier',
          attributes: ['id', 'username'],
          required: Boolean(cashierWhere),
          where: cashierWhere
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    return {
      settlements: rows.map(row => {
        const plain = row.get({ plain: true }) as Record<string, unknown>;
        const cashier = plain.cashier as { username?: string } | undefined;
        return {
          ...this.mapSettlement(row),
          cashierUsername: cashier?.username ?? ''
        };
      }),
      total: count,
      page,
      limit
    };
  }

  private async queryFlows(
    cashierIds: string[],
    periodStart?: Date,
    periodEnd?: Date,
    transaction?: Transaction
  ): Promise<Map<string, PeriodFlows>> {
    const replacements: Record<string, unknown> = {};
    const placeholders = cashierIds
      .map((id, index) => {
        const key = `cashier${index}`;
        replacements[key] = id;
        return `:${key}`;
      })
      .join(', ');

    const dateConditions: string[] = [];
    if (periodStart) {
      dateConditions.push('created_at >= :periodStart');
      replacements.periodStart = periodStart;
    }
    if (periodEnd) {
      dateConditions.push('created_at <= :periodEnd');
      replacements.periodEnd = periodEnd;
    }
    const dateFilter = dateConditions.length ? `AND ${dateConditions.join(' AND ')}` : '';

    // Ventas y premios: el cajero es related_user_id, el jugador user_id.
    // Fichas entregadas: el cajero es user_id y el que carga (owner) related_user_id.
    const rows = await sequelize.query<{
      cashier_id: string;
      total_sales: string;
      total_prizes: string;
      chips_delivered: string;
    }>(
      `SELECT cashier_id,
              COALESCE(SUM(sales), 0) AS total_sales,
              COALESCE(SUM(prizes), 0) AS total_prizes,
              COALESCE(SUM(delivered), 0) AS chips_delivered
         FROM (
           SELECT related_user_id AS cashier_id,
                  CASE WHEN type = 'SELL_TO_PLAYER' THEN amount ELSE 0 END AS sales,
                  CASE WHEN type = 'PRIZE' THEN -amount ELSE 0 END AS prizes,
                  0 AS delivered
             FROM chip_movements
            WHERE related_user_id IN (${placeholders})
              AND user_id <> related_user_id
              AND type IN ('SELL_TO_PLAYER', 'PRIZE')
              ${dateFilter}
           UNION ALL
           SELECT user_id AS cashier_id, 0, 0, amount
             FROM chip_movements
            WHERE user_id IN (${placeholders})
              AND type = 'SELL_TO_PLAYER'
              AND related_user_id IS NOT NULL
              AND related_user_id <> user_id
              ${dateFilter}
         ) flows
        GROUP BY cashier_id`,
      { replacements, type: QueryTypes.SELECT, transaction }
    );

    const map = new Map<string, PeriodFlows>();
    for (const row of rows) {
      map.set(row.cashier_id, {
        totalSales: toNumber(row.total_sales),
        totalPrizes: toNumber(row.total_prizes),
        chipsDelivered: toNumber(row.chips_delivered)
      });
    }
    return map;
  }

  private mapCompensationMode(mode: CashierCompensationModeModel): CashierCompensationMode {
    const plain = mode.get({ plain: true }) as Record<string, unknown>;
    return {
      id: plain.id as string,
      cashierId: (plain.cashierId || plain.cashier_id) as string,
      type: plain.type as CompensationType,
      percentage: plain.percentage === null || plain.percentage === undefined
        ? null
        : parseFloat(String(plain.percentage)),
      activeFrom: new Date(plain.activeFrom as string || plain.active_from as string),
      activeTo: plain.activeTo
        ? new Date(plain.activeTo as string)
        : plain.active_to
          ? new Date(plain.active_to as string)
          : null,
      createdAt: new Date(plain.createdAt as string || plain.created_at as string)
    };
  }

  private mapCollection(row: CashierCollectionModel): CashierCollection {
    const plain = row.get({ plain: true }) as Record<string, unknown>;
    return {
      id: plain.id as string,
      settlementId: (plain.settlementId ?? plain.settlement_id) as string,
      cashierId: (plain.cashierId ?? plain.cashier_id) as string,
      amount: toNumber(plain.amount),
      paymentReference: (plain.paymentReference ?? plain.payment_reference ?? null) as string | null,
      createdBy: (plain.createdBy ?? plain.created_by ?? null) as string | null,
      createdAt: new Date((plain.createdAt ?? plain.created_at) as string)
    };
  }

  private mapSettlement(settlement: CashierSettlementModel): CashierSettlement {
    const plain = settlement.get({ plain: true }) as Record<string, unknown>;
    const pick = (camel: string, snake: string) => plain[camel] ?? plain[snake];
    return {
      id: plain.id as string,
      cashierId: (plain.cashierId || plain.cashier_id) as string,
      periodStart: new Date(plain.periodStart as string || plain.period_start as string),
      periodEnd: new Date(plain.periodEnd as string || plain.period_end as string),
      totalSales: toNumber(pick('totalSales', 'total_sales')),
      totalPrizesPaid: toNumber(pick('totalPrizesPaid', 'total_prizes_paid')),
      profit: toNumber(plain.profit),
      payableAmount: toNumber(pick('payableAmount', 'payable_amount')),
      status: plain.status as SettlementStatus,
      compensationType: (plain.compensationType ?? plain.compensation_type ?? null) as CompensationType | null,
      percentage: toNullableNumber(plain.percentage),
      notes: (plain.notes ?? null) as string | null,
      createdBy: (plain.createdBy ?? plain.created_by ?? null) as string | null,
      paidBy: (plain.paidBy ?? plain.paid_by ?? null) as string | null,
      paymentReference: (plain.paymentReference ?? plain.payment_reference ?? null) as string | null,
      createdAt: new Date(plain.createdAt as string || plain.created_at as string),
      paidAt: plain.paidAt
        ? new Date(plain.paidAt as string)
        : plain.paid_at
          ? new Date(plain.paid_at as string)
          : null,
      commission: toNullableNumber(pick('commission', 'commission')),
      subtotal: toNullableNumber(pick('subtotal', 'subtotal')),
      previousDebt: toNullableNumber(pick('previousDebt', 'previous_debt')),
      totalDue: toNullableNumber(pick('totalDue', 'total_due')),
      collected: toNullableNumber(pick('collected', 'collected')),
      debtCarried: toNullableNumber(pick('debtCarried', 'debt_carried')),
      chipsDelivered: toNullableNumber(pick('chipsDelivered', 'chips_delivered')),
      chipBalanceBefore: toNullableNumber(pick('chipBalanceBefore', 'chip_balance_before')),
      prizeChipsRecovered: toNullableNumber(pick('prizeChipsRecovered', 'prize_chips_recovered')),
      unsoldChips: toNullableNumber(pick('unsoldChips', 'unsold_chips')),
      chipsLeft: toNullableNumber(pick('chipsLeft', 'chips_left')),
      unsoldChipsRecovered: toNullableNumber(pick('unsoldChipsRecovered', 'unsold_chips_recovered'))
    };
  }
}

export const cashierAccountsRepository = new CashierAccountsRepository();
