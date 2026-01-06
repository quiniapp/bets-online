import { BalanceModel } from '../models';
import { Balance } from 'helper';
import { Op } from 'sequelize';

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

  private mapToBalance(data: Record<string, unknown>): Balance {
    return {
      id: data.id,
      userId: data.userId || data.user_id,
      chipBalance: parseFloat(data.chipBalance || data.chip_balance),
      lastUpdatedAt: new Date(data.lastUpdatedAt || data.last_updated_at)
    };
  }
}

export const balancesRepository = new BalancesRepository();
