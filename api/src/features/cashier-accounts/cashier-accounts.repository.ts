import { Op, QueryTypes } from 'sequelize';
import {
  CashierCompensationMode,
  CashierSettlement,
  ChipMovementType,
  CompensationType,
  SettlementStatus
} from 'helper';
import {
  CashierCompensationModeModel,
  CashierSettlementModel,
  UserModel
} from '../../persistence/models';
import { sequelize } from '../../config/sequelize';

export interface MovementTotals {
  totalSales: number;
  totalPrizes: number;
}

export interface SettlementListFilters {
  cashierIds?: string[];
  cashierId?: string;
  status?: SettlementStatus;
  search?: string;
  page?: number;
  limit?: number;
}

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
      order: [['createdAt', 'DESC']]
    });
    return settlements.map(settlement => this.mapSettlement(settlement));
  }

  async findSettlementsForCashier(cashierId: string): Promise<CashierSettlement[]> {
    const settlements = await CashierSettlementModel.findAll({
      where: { cashierId },
      order: [['createdAt', 'DESC']]
    });
    return settlements.map(settlement => this.mapSettlement(settlement));
  }

  async findSettlementById(id: string): Promise<CashierSettlement | null> {
    const settlement = await CashierSettlementModel.findByPk(id);
    return settlement ? this.mapSettlement(settlement) : null;
  }

  async findOverlappingSettlement(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CashierSettlement | null> {
    const settlement = await CashierSettlementModel.findOne({
      where: {
        cashierId,
        status: { [Op.ne]: SettlementStatus.CANCELED },
        periodStart: { [Op.lt]: periodEnd },
        periodEnd: { [Op.gt]: periodStart }
      }
    });
    return settlement ? this.mapSettlement(settlement) : null;
  }

  async createSettlement(data: {
    cashierId: string;
    periodStart: Date;
    periodEnd: Date;
    totalSales: number;
    totalPrizesPaid: number;
    profit: number;
    payableAmount: number;
    compensationType: CompensationType | null;
    percentage: number | null;
    notes?: string;
    createdBy: string;
  }): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.create({
      cashierId: data.cashierId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalSales: data.totalSales,
      totalPrizesPaid: data.totalPrizesPaid,
      profit: data.profit,
      payableAmount: data.payableAmount,
      compensationType: data.compensationType,
      percentage: data.percentage,
      notes: data.notes || null,
      createdBy: data.createdBy,
      status: SettlementStatus.PENDING
    });
    return this.mapSettlement(settlement);
  }

  async markSettlementPaid(
    id: string,
    data: { paidBy: string; paymentReference?: string; notes?: string }
  ): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.findByPk(id);
    if (!settlement) throw new Error('Settlement not found');

    await settlement.update({
      status: SettlementStatus.PAID,
      paidAt: new Date(),
      paidBy: data.paidBy,
      paymentReference: data.paymentReference || null,
      notes: data.notes ?? settlement.notes
    });
    return this.mapSettlement(settlement);
  }

  async markSettlementCanceled(id: string, notes?: string): Promise<CashierSettlement> {
    const settlement = await CashierSettlementModel.findByPk(id);
    if (!settlement) throw new Error('Settlement not found');

    await settlement.update({
      status: SettlementStatus.CANCELED,
      notes: notes ?? settlement.notes
    });
    return this.mapSettlement(settlement);
  }

  async getMovementTotals(cashierIds: string[]): Promise<Map<string, MovementTotals>> {
    if (cashierIds.length === 0) return new Map();
    const rows = await this.queryMovementTotals(cashierIds);
    return this.toTotalsMap(rows);
  }

  async getMovementTotalsForPeriod(
    cashierId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MovementTotals> {
    const rows = await this.queryMovementTotals([cashierId], periodStart, periodEnd);
    const totals = this.toTotalsMap(rows).get(cashierId);
    return totals ?? { totalSales: 0, totalPrizes: 0 };
  }

  async findRecentAccountMovements(cashierId: string, limit = 50) {
    const rows = await sequelize.query<{
      id: string;
      user_id: string;
      player_username: string | null;
      type: ChipMovementType;
      amount: string;
      description: string | null;
      created_at: Date;
    }>(
      `SELECT cm.id, cm.user_id, u.username AS player_username, cm.type, cm.amount,
              cm.description, cm.created_at
       FROM chip_movements cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.related_user_id = :cashierId
         AND cm.type IN ('SELL_TO_PLAYER', 'PRIZE')
       ORDER BY cm.created_at DESC
       LIMIT :limit`,
      {
        replacements: { cashierId, limit },
        type: QueryTypes.SELECT
      }
    );

    return rows.map(row => ({
      id: row.id,
      playerId: row.user_id,
      playerUsername: row.player_username,
      type: row.type,
      amount: parseFloat(String(row.amount)),
      description: row.description,
      createdAt: new Date(row.created_at)
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

  private async queryMovementTotals(
    cashierIds: string[],
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<Array<{ cashier_id: string; total_sales: string; total_prizes: string }>> {
    const replacements: Record<string, unknown> = {};
    const placeholders = cashierIds
      .map((id, index) => {
        const key = `cashier${index}`;
        replacements[key] = id;
        return `:${key}`;
      })
      .join(', ');

    const conditions = [
      `related_user_id IN (${placeholders})`,
      `type IN ('SELL_TO_PLAYER', 'PRIZE')`
    ];
    if (periodStart) {
      conditions.push('created_at >= :periodStart');
      replacements.periodStart = periodStart;
    }
    if (periodEnd) {
      conditions.push('created_at <= :periodEnd');
      replacements.periodEnd = periodEnd;
    }

    return sequelize.query(
      `SELECT related_user_id AS cashier_id,
              COALESCE(SUM(CASE WHEN type = 'SELL_TO_PLAYER' THEN amount ELSE 0 END), 0) AS total_sales,
              COALESCE(SUM(CASE WHEN type = 'PRIZE' THEN -amount ELSE 0 END), 0) AS total_prizes
       FROM chip_movements
       WHERE ${conditions.join(' AND ')}
       GROUP BY related_user_id`,
      { replacements, type: QueryTypes.SELECT }
    );
  }

  private toTotalsMap(
    rows: Array<{ cashier_id: string; total_sales: string; total_prizes: string }>
  ): Map<string, MovementTotals> {
    const map = new Map<string, MovementTotals>();
    for (const row of rows) {
      map.set(row.cashier_id, {
        totalSales: parseFloat(String(row.total_sales)) || 0,
        totalPrizes: parseFloat(String(row.total_prizes)) || 0
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

  private mapSettlement(settlement: CashierSettlementModel): CashierSettlement {
    const plain = settlement.get({ plain: true }) as Record<string, unknown>;
    return {
      id: plain.id as string,
      cashierId: (plain.cashierId || plain.cashier_id) as string,
      periodStart: new Date(plain.periodStart as string || plain.period_start as string),
      periodEnd: new Date(plain.periodEnd as string || plain.period_end as string),
      totalSales: parseFloat(String(plain.totalSales ?? plain.total_sales ?? 0)),
      totalPrizesPaid: parseFloat(String(plain.totalPrizesPaid ?? plain.total_prizes_paid ?? 0)),
      profit: parseFloat(String(plain.profit ?? 0)),
      payableAmount: parseFloat(String(plain.payableAmount ?? plain.payable_amount ?? 0)),
      status: plain.status as SettlementStatus,
      compensationType: (plain.compensationType ?? plain.compensation_type ?? null) as CompensationType | null,
      percentage: plain.percentage === null || plain.percentage === undefined
        ? null
        : parseFloat(String(plain.percentage)),
      notes: (plain.notes ?? null) as string | null,
      createdBy: (plain.createdBy ?? plain.created_by ?? null) as string | null,
      paidBy: (plain.paidBy ?? plain.paid_by ?? null) as string | null,
      paymentReference: (plain.paymentReference ?? plain.payment_reference ?? null) as string | null,
      createdAt: new Date(plain.createdAt as string || plain.created_at as string),
      paidAt: plain.paidAt
        ? new Date(plain.paidAt as string)
        : plain.paid_at
          ? new Date(plain.paid_at as string)
          : null
    };
  }
}

export const cashierAccountsRepository = new CashierAccountsRepository();
