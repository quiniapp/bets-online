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
      const createdAtFilter: Record<symbol, Date> = {};
      if (options.startDate) {
        createdAtFilter[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        createdAtFilter[Op.lte] = options.endDate;
      }
      where.createdAt = createdAtFilter;
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
      const createdAtFilter: Record<symbol, Date> = {};
      if (options.startDate) {
        createdAtFilter[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        createdAtFilter[Op.lte] = options.endDate;
      }
      where.createdAt = createdAtFilter;
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

  private mapToMovement(data: ChipMovementModel | Record<string, unknown>): ChipMovement {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof ChipMovementModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      userId: (plain.userId || plain.user_id) as string,
      relatedUserId: (plain.relatedUserId || plain.related_user_id) as string | null,
      type: plain.type as ChipMovementType,
      amount: parseFloat(String(plain.amount)),
      description: (plain.description || undefined) as string | undefined,
      previousBalance: parseFloat(String(plain.previousBalance || plain.previous_balance)),
      newBalance: parseFloat(String(plain.newBalance || plain.new_balance)),
      createdAt: new Date(plain.createdAt || plain.created_at)
    };
  }
}

export const chipMovementsRepository = new ChipMovementsRepository();
