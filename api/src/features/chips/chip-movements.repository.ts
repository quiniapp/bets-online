import { ChipMovementModel } from '../../persistence/models';
import { ChipMovement, CreateChipMovementDto, ChipMovementType } from 'helper';
import { Op, Transaction } from 'sequelize';

export class ChipMovementsRepository {
  async create(
    movementData: CreateChipMovementDto & {
      previousBalance: number;
      newBalance: number;
    },
    transaction?: Transaction
  ): Promise<ChipMovement> {
    const movement = await ChipMovementModel.create(
      {
        userId: movementData.userId,
        relatedUserId: movementData.relatedUserId || null,
        type: movementData.type,
        amount: movementData.amount,
        description: movementData.description || null,
        previousBalance: movementData.previousBalance,
        newBalance: movementData.newBalance,
        idempotencyKey: movementData.idempotencyKey || null
      },
      { transaction }
    );

    return this.mapToMovement(movement);
  }

  async findByIdempotencyKey(key: string): Promise<ChipMovement | null> {
    const movement = await ChipMovementModel.findOne({
      where: { idempotencyKey: key }
    });
    if (!movement) return null;
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
      compact?: boolean;
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

    // Exclude GAME_WIN rows with amount <= 0: NOT(type=GAME_WIN AND amount<=0) = (type!=GAME_WIN OR amount>0)
    (where as Record<string | symbol, unknown>)[Op.or] = [
      { type: { [Op.ne]: ChipMovementType.GAME_WIN } },
      { amount: { [Op.gt]: 0 } }
    ];

    const attributes = options?.compact
      ? ['id', 'type', 'amount', 'createdAt']
      : undefined;

    const { count, rows } = await ChipMovementModel.findAndCountAll({
      where,
      attributes,
      limit: options?.limit,
      offset: options?.offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      movements: rows.map(m => options?.compact ? this.mapToCompact(m) : this.mapToMovement(m)),
      total: count
    };
  }

  async findByUserIds(
    userIds: string[],
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ): Promise<{ movements: ChipMovement[]; total: number }> {
    const where: Record<string | symbol, unknown> = {
      userId: { [Op.in]: userIds }
    };

    if (options?.type) where.type = options.type;

    if (options?.startDate || options?.endDate) {
      const createdAtFilter: Record<symbol, Date> = {};
      if (options?.startDate) createdAtFilter[Op.gte] = options.startDate;
      if (options?.endDate) createdAtFilter[Op.lte] = options.endDate;
      where.createdAt = createdAtFilter;
    }

    where[Op.or] = [
      { type: { [Op.ne]: ChipMovementType.GAME_WIN } },
      { amount: { [Op.gt]: 0 } }
    ];

    const { count, rows } = await ChipMovementModel.findAndCountAll({
      where,
      limit: options?.limit,
      offset: options?.offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      movements: rows.map(m => this.mapToMovement(m)),
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

  private mapToCompact(data: ChipMovementModel): ChipMovement {
    const plain = data.get({ plain: true });
    return {
      id: plain.id as string,
      type: plain.type as ChipMovementType,
      amount: parseFloat(String(plain.amount)),
      createdAt: new Date(plain.createdAt || plain.created_at),
      userId: '',
      relatedUserId: null,
      previousBalance: 0,
      newBalance: 0,
      idempotencyKey: null,
    };
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
      idempotencyKey: (plain.idempotencyKey || plain.idempotency_key || null) as string | null,
      createdAt: new Date(plain.createdAt || plain.created_at)
    };
  }
}

export const chipMovementsRepository = new ChipMovementsRepository();
