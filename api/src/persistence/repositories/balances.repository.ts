import { BalanceModel } from '../models';
import { Balance } from 'helper';
import { Op, Transaction } from 'sequelize';

export class BalancesRepository {
  async findByUserId(userId: string): Promise<Balance | null> {
    const balance = await BalanceModel.findOne({
      where: { userId }
    });
    if (!balance) return null;
    return this.mapToBalance(balance);
  }

  async findByUserIds(userIds: string[]): Promise<Balance[]> {
    const balances = await BalanceModel.findAll({
      where: {
        userId: {
          [Op.in]: userIds
        }
      }
    });
    return balances.map(this.mapToBalance);
  }

  async create(userId: string, initialBalance = 0): Promise<Balance> {
    const balance = await BalanceModel.create({
      userId,
      chipBalance: initialBalance,
      lastUpdatedAt: new Date()
    });
    return this.mapToBalance(balance);
  }

  async updateBalance(userId: string, newBalance: number): Promise<Balance> {
    const balance = await BalanceModel.findOne({
      where: { userId }
    });

    if (!balance) {
      throw new Error('Balance not found');
    }

    await balance.update({
      chipBalance: newBalance,
      lastUpdatedAt: new Date()
    });

    return this.mapToBalance(balance);
  }

  async incrementBalance(userId: string, amount: number): Promise<Balance> {
    const balance = await this.findByUserId(userId);
    if (!balance) {
      throw new Error('Balance not found');
    }

    const newBalance = balance.chipBalance + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    return this.updateBalance(userId, newBalance);
  }

  async decrementBalance(userId: string, amount: number): Promise<Balance> {
    return this.incrementBalance(userId, -amount);
  }

  async updateChipBalance(
    userId: string,
    newBalance: string,
    transaction?: Transaction
  ): Promise<void> {
    const balance = await BalanceModel.findOne({
      where: { userId },
      transaction,
      lock: transaction ? true : undefined
    });

    if (!balance) {
      throw new Error('Balance not found');
    }

    await balance.update(
      {
        chipBalance: String(newBalance),
        lastUpdatedAt: new Date()
      },
      { transaction }
    );
  }

  async findByUserIdWithLock(
    userId: string,
    transaction: Transaction
  ): Promise<Balance | null> {
    const balance = await BalanceModel.findOne({
      where: { userId },
      transaction,
      lock: true
    });
    if (!balance) return null;
    return this.mapToBalance(balance);
  }

  private mapToBalance(data: BalanceModel | Record<string, unknown>): Balance {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof BalanceModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      userId: (plain.userId || plain.user_id) as string,
      chipBalance: parseFloat(String(plain.chipBalance || plain.chip_balance || 0)),
      lastUpdatedAt: new Date(plain.lastUpdatedAt || plain.last_updated_at)
    };
  }
}

export const balancesRepository = new BalancesRepository();
