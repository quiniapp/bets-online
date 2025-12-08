import { ChipMovementModel } from '../models';
import { ChipMovement, CreateChipMovementDto, ChipMovementType } from 'helper';
import { Op } from 'sequelize';

export class ChipMovementsRepository {
  async create(movementData: CreateChipMovementDto & {
    previousBalance: number;
    newBalance: number;
  }): Promise<ChipMovement> {
    const movement = await ChipMovementModel.create({
      userId: movementData.userId,
      relatedUserId: movementData.relatedUserId || null,
      type: movementData.type,
      amount: movementData.amount,
      description: movementData.description || null,
      previousBalance: movementData.previousBalance,
      newBalance: movementData.newBalance
    });

    return this.mapToMovement(movement);
  }

  async findById(id: string): Promise<ChipMovement | null> {
    const movement = await ChipMovementModel.findByPk(id);
    if (!movement) return null;
    return this.mapToMovement(movement);
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ): Promise<{ movements: ChipMovement[]; total: number }> {
    const where: Record<string, unknown> = { userId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    const { count, rows } = await ChipMovementModel.findAndCountAll({
      where,
      limit: options?.limit,
      offset: options?.offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      movements: rows.map(this.mapToMovement),
      total: count
    };
  }

  async findByRelatedUserId(
    relatedUserId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ): Promise<{ movements: ChipMovement[]; total: number }> {
    const where: Record<string, unknown> = { relatedUserId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    const { count, rows } = await ChipMovementModel.findAndCountAll({
      where,
      limit: options?.limit,
      offset: options?.offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      movements: rows.map(this.mapToMovement),
      total: count
    };
  }

  async getSalesSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalSales: number; totalPrizes: number }> {
    // Get total sales
    const salesResult = await ChipMovementModel.findAll({
      where: {
        relatedUserId: userId,
        type: ChipMovementType.SELL_TO_PLAYER,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      attributes: ['amount']
    });

    // Get total prizes
    const prizesResult = await ChipMovementModel.findAll({
      where: {
        relatedUserId: userId,
        type: ChipMovementType.PRIZE,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      attributes: ['amount']
    });

    const totalSales = salesResult.reduce((sum, m) => sum + parseFloat(String(m.amount)), 0);
    const totalPrizes = prizesResult.reduce((sum, m) => sum + parseFloat(String(m.amount)), 0);

    return { totalSales, totalPrizes };
  }

  private mapToMovement(data: Record<string, unknown>): ChipMovement {
    return {
      id: data.id,
      userId: data.userId || data.user_id,
      relatedUserId: data.relatedUserId || data.related_user_id,
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
      previousBalance: parseFloat(data.previousBalance || data.previous_balance),
      newBalance: parseFloat(data.newBalance || data.new_balance),
      createdAt: new Date(data.createdAt || data.created_at)
    };
  }
}

export const chipMovementsRepository = new ChipMovementsRepository();
