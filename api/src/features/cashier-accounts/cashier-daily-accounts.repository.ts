import { Op, QueryTypes, Transaction } from 'sequelize';
import { CashierDailyAccount } from 'helper';
import { CashierCurrentAccountModel, UserModel } from '../../persistence/models';
import { sequelize } from '../../config/sequelize';

export interface DailyMovementTotals {
  sales: number;
  prizes: number;
}

export interface DailyAccountUpsertData {
  cashierId: string;
  date: string;
  pass: number;
  successes: number;
  claims: number;
  subtotal: number;
  previousBalance: number;
  collections: number;
  paid: number;
  total: number;
  drag: number;
  leave: number;
  cashierCommission: number;
  bills: number;
  revenue: number;
  previousDrag: number;
  isLiquidated: boolean;
}

export class CashierDailyAccountsRepository {
  async findDailyAccounts(cashierIds: string[], date: string): Promise<CashierDailyAccount[]> {
    if (cashierIds.length === 0) return [];
    const rows = await CashierCurrentAccountModel.findAll({
      where: { cashierId: { [Op.in]: cashierIds }, date },
      include: [{ model: UserModel, as: 'cashier', attributes: ['id', 'username'] }],
      order: [['date', 'ASC']]
    });
    return rows.map(row => this.map(row));
  }

  async findDailyAccountById(id: string): Promise<CashierDailyAccount | null> {
    const row = await CashierCurrentAccountModel.findByPk(id, {
      include: [{ model: UserModel, as: 'cashier', attributes: ['id', 'username'] }]
    });
    return row ? this.map(row) : null;
  }

  async findPreviousDailyAccount(cashierId: string, date: string): Promise<CashierDailyAccount | null> {
    const row = await CashierCurrentAccountModel.findOne({
      where: { cashierId, date: { [Op.lt]: date } },
      order: [['date', 'DESC']]
    });
    return row ? this.map(row) : null;
  }

  async findDailyAccountsFromDate(cashierId: string, date: string): Promise<CashierDailyAccount[]> {
    const rows = await CashierCurrentAccountModel.findAll({
      where: { cashierId, date: { [Op.gte]: date } },
      order: [['date', 'ASC']]
    });
    return rows.map(row => this.map(row));
  }

  async upsertDailyAccount(data: DailyAccountUpsertData): Promise<CashierDailyAccount> {
    const existing = await CashierCurrentAccountModel.findOne({
      where: { cashierId: data.cashierId, date: data.date }
    });

    const values = {
      cashierId: data.cashierId,
      date: data.date,
      pass: data.pass,
      successes: data.successes,
      claims: data.claims,
      subtotal: data.subtotal,
      previousBalance: data.previousBalance,
      collections: data.collections,
      paid: data.paid,
      total: data.total,
      drag: data.drag,
      leave: data.leave,
      cashierCommission: data.cashierCommission,
      bills: data.bills,
      revenue: data.revenue,
      previousDrag: data.previousDrag,
      isLiquidated: data.isLiquidated
    };

    if (existing) {
      await existing.update(values);
      return this.map(existing);
    }

    const created = await CashierCurrentAccountModel.create(values);
    return this.map(created);
  }

  async updateDailyAccountFields(
    id: string,
    fields: Partial<Pick<DailyAccountUpsertData, 'claims' | 'collections' | 'paid' | 'leave'>>,
    transaction?: Transaction
  ): Promise<void> {
    await CashierCurrentAccountModel.update(fields, { where: { id }, transaction });
  }

  async markDailyLiquidated(cashierIds: string[], date: string): Promise<void> {
    if (cashierIds.length === 0) return;
    await CashierCurrentAccountModel.update(
      { isLiquidated: true },
      { where: { cashierId: { [Op.in]: cashierIds }, date } }
    );
  }

  async getDailyMovementTotals(
    cashierIds: string[],
    date: string,
    timezone: string
  ): Promise<Map<string, DailyMovementTotals>> {
    if (cashierIds.length === 0) return new Map();

    const replacements: Record<string, unknown> = { date, timezone };
    const placeholders = cashierIds
      .map((id, index) => {
        const key = `cashier${index}`;
        replacements[key] = id;
        return `:${key}`;
      })
      .join(', ');

    const rows = await sequelize.query<{ cashier_id: string; sales: string; prizes: string }>(
      `SELECT related_user_id AS cashier_id,
              COALESCE(SUM(CASE WHEN type = 'SELL_TO_PLAYER' THEN amount ELSE 0 END), 0) AS sales,
              COALESCE(SUM(CASE WHEN type = 'PRIZE' THEN -amount ELSE 0 END), 0) AS prizes
         FROM chip_movements
        WHERE related_user_id IN (${placeholders})
          AND type IN ('SELL_TO_PLAYER', 'PRIZE')
          AND created_at >= (:date::date::timestamp AT TIME ZONE :timezone)
          AND created_at < ((:date::date + 1)::timestamp AT TIME ZONE :timezone)
        GROUP BY related_user_id`,
      { replacements, type: QueryTypes.SELECT }
    );

    return new Map(
      rows.map(row => [
        row.cashier_id,
        {
          sales: parseFloat(String(row.sales)) || 0,
          prizes: parseFloat(String(row.prizes)) || 0
        }
      ])
    );
  }

  private map(row: CashierCurrentAccountModel): CashierDailyAccount {
    const plain = row.get({ plain: true }) as Record<string, unknown>;
    const cashier = plain.cashier as { username?: string } | undefined;

    return {
      id: plain.id as string,
      cashierId: (plain.cashierId || plain.cashier_id) as string,
      cashierUsername: cashier?.username ?? '',
      date: String(plain.date),
      pass: parseFloat(String(plain.pass ?? 0)),
      successes: parseFloat(String(plain.successes ?? 0)),
      claims: parseFloat(String(plain.claims ?? 0)),
      subtotal: parseFloat(String(plain.subtotal ?? 0)),
      previousBalance: parseFloat(String(plain.previousBalance ?? plain.previous_balance ?? 0)),
      collections: parseFloat(String(plain.collections ?? 0)),
      paid: parseFloat(String(plain.paid ?? 0)),
      total: parseFloat(String(plain.total ?? 0)),
      drag: parseFloat(String(plain.drag ?? 0)),
      leave: parseFloat(String(plain.leave ?? 0)),
      cashierCommission: parseFloat(String(plain.cashierCommission ?? plain.cashier_commission ?? 0)),
      bills: parseFloat(String(plain.bills ?? 0)),
      revenue: parseFloat(String(plain.revenue ?? 0)),
      previousDrag: parseFloat(String(plain.previousDrag ?? plain.previous_drag ?? 0)),
      isLiquidated: Boolean(plain.isLiquidated ?? plain.is_liquidated),
      createdAt: new Date(plain.createdAt as string || plain.created_at as string),
      updatedAt: new Date(plain.updatedAt as string || plain.updated_at as string)
    };
  }
}

export const cashierDailyAccountsRepository = new CashierDailyAccountsRepository();
