import {
  ChipMovement,
  ChipMovementType,
  ErrorCode,
  UserRole
} from 'helper';
import { usersRepository } from '../../persistence/repositories/users.repository';
import { balancesRepository } from '../../persistence/repositories/balances.repository';
import { chipMovementsRepository } from '../../persistence/repositories/chip-movements.repository';
import { AppError } from '../../middleware/error.middleware';
import { sequelize } from '../../config/sequelize';

export class ChipsDomain {
  /**
   * Sell chips from cashier/admin to player
   */
  async sellChips(
    sellerId: string,
    playerId: string,
    amount: number,
    description?: string,
    idempotencyKey?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    if (idempotencyKey) {
      const existing = await chipMovementsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const seller = await usersRepository.findById(sellerId);
    const player = await usersRepository.findById(playerId);

    if (!seller || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Validar que el player esté en el árbol del seller
    // Hijo directo (parentUserId) o descendiente (owner/admin pueden ver todo su árbol)
    const isDirectChild = player.parentUserId === sellerId;
    if (!isDirectChild) {
      const descendants = await usersRepository.findDescendants(sellerId);
      const isDescendant = descendants.some(d => d.id === playerId);
      if (!isDescendant) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Can only sell chips to users in your hierarchy'
        );
      }
    }

    const t = await sequelize.transaction();
    try {
      const playerBalance = await balancesRepository.findByUserIdWithLock(playerId, t);
      if (!playerBalance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
      }

      if (seller.role !== UserRole.OWNER) {
        const sellerBalance = await balancesRepository.findByUserIdWithLock(sellerId, t);
        if (!sellerBalance || sellerBalance.chipBalance < amount) {
          throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance to sell chips');
        }
      }

      const movement = await chipMovementsRepository.create(
        {
          userId: playerId,
          relatedUserId: sellerId,
          type: ChipMovementType.SELL_TO_PLAYER,
          amount,
          description,
          previousBalance: playerBalance.chipBalance,
          newBalance: playerBalance.chipBalance + amount,
          idempotencyKey
        },
        t
      );

      await balancesRepository.atomicIncrement(playerId, amount, t);

      if (seller.role !== UserRole.OWNER) {
        await balancesRepository.atomicIncrement(sellerId, -amount, t);
      }

      await t.commit();
      return movement;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Pay prize to player
   */
  async payPrize(
    cashierId: string,
    playerId: string,
    amount: number,
    description?: string,
    idempotencyKey?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    if (idempotencyKey) {
      const existing = await chipMovementsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const cashier = await usersRepository.findById(cashierId);
    const player = await usersRepository.findById(playerId);

    if (!cashier || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const isDirectChildPrize = player.parentUserId === cashierId;
    if (!isDirectChildPrize) {
      const descendants = await usersRepository.findDescendants(cashierId);
      if (!descendants.some(d => d.id === playerId)) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Can only pay prizes to users in your hierarchy');
      }
    }

    const t = await sequelize.transaction();
    try {
      const playerBalance = await balancesRepository.findByUserIdWithLock(playerId, t);
      if (!playerBalance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
      }

      if (playerBalance.chipBalance < amount) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Player has insufficient balance');
      }

      const movement = await chipMovementsRepository.create(
        {
          userId: playerId,
          relatedUserId: cashierId,
          type: ChipMovementType.PRIZE,
          amount: -amount,
          description,
          previousBalance: playerBalance.chipBalance,
          newBalance: playerBalance.chipBalance - amount,
          idempotencyKey
        },
        t
      );

      await balancesRepository.atomicIncrement(playerId, -amount, t);

      if (cashier.role !== UserRole.OWNER) {
        await balancesRepository.atomicIncrement(cashierId, amount, t);
      }

      await t.commit();
      return movement;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Register a loss for player
   */
  async registerLoss(
    cashierId: string,
    playerId: string,
    amount: number,
    description?: string,
    idempotencyKey?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    if (idempotencyKey) {
      const existing = await chipMovementsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const cashier = await usersRepository.findById(cashierId);
    const player = await usersRepository.findById(playerId);

    if (!cashier || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const isDirectChildLoss = player.parentUserId === cashierId;
    if (!isDirectChildLoss) {
      const descendants = await usersRepository.findDescendants(cashierId);
      if (!descendants.some(d => d.id === playerId)) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Can only register losses for users in your hierarchy');
      }
    }

    const t = await sequelize.transaction();
    try {
      const balance = await balancesRepository.findByUserIdWithLock(playerId, t);
      if (!balance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
      }

      if (balance.chipBalance < amount) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance');
      }

      const movement = await chipMovementsRepository.create(
        {
          userId: playerId,
          relatedUserId: cashierId,
          type: ChipMovementType.LOSS,
          amount: -amount,
          description,
          previousBalance: balance.chipBalance,
          newBalance: balance.chipBalance - amount,
          idempotencyKey
        },
        t
      );

      await balancesRepository.atomicIncrement(playerId, -amount, t);

      if (cashier.role !== UserRole.OWNER) {
        await balancesRepository.atomicIncrement(cashierId, amount, t);
      }

      await t.commit();
      return movement;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Withdraw chips (player cashing out)
   */
  async withdraw(
    requesterId: string,
    playerId: string,
    amount: number,
    description?: string,
    idempotencyKey?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    if (idempotencyKey) {
      const existing = await chipMovementsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const requester = await usersRepository.findById(requesterId);
    const player = await usersRepository.findById(playerId);

    if (!requester || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    if (requesterId !== playerId) {
      const isDirectChildWithdraw = player.parentUserId === requesterId;
      if (!isDirectChildWithdraw) {
        const descendants = await usersRepository.findDescendants(requesterId);
        if (!descendants.some(d => d.id === playerId)) {
          throw new AppError(403, ErrorCode.FORBIDDEN, 'Cannot process withdrawal for this user');
        }
      }
    }

    const t = await sequelize.transaction();
    try {
      const balance = await balancesRepository.findByUserIdWithLock(playerId, t);
      if (!balance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
      }

      if (balance.chipBalance < amount) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance');
      }

      const movement = await chipMovementsRepository.create(
        {
          userId: playerId,
          relatedUserId: requesterId,
          type: ChipMovementType.WITHDRAWAL,
          amount: -amount,
          description,
          previousBalance: balance.chipBalance,
          newBalance: balance.chipBalance - amount,
          idempotencyKey
        },
        t
      );

      await balancesRepository.atomicIncrement(playerId, -amount, t);

      const creditUserId = requesterId !== playerId
        ? requesterId
        : player.parentUserId;

      if (creditUserId) {
        const creditUser = await usersRepository.findById(creditUserId);
        if (creditUser && creditUser.role !== UserRole.OWNER) {
          await balancesRepository.atomicIncrement(creditUserId, amount, t);
        }
      }

      await t.commit();
      return movement;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get movement history for a user
   */
  async getMovementHistory(
    requesterId: string,
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
      compact?: boolean;
    }
  ): Promise<{ movements: ChipMovement[]; total: number; page: number; limit: number }> {
    const requester = await usersRepository.findById(requesterId);
    const user = await usersRepository.findById(userId);

    if (!requester || !user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    if (requester.role !== UserRole.OWNER && requesterId !== userId) {
      const descendants = await usersRepository.findDescendants(requesterId);
      const canView = descendants.some(d => d.id === userId);

      if (!canView) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Cannot view movements for this user');
      }
    }

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const result = await chipMovementsRepository.findByUserId(userId, {
      limit,
      offset,
      startDate: options?.startDate,
      endDate: options?.endDate,
      type: options?.type,
      compact: options?.compact,
    });

    return {
      movements: result.movements,
      total: result.total,
      page,
      limit
    };
  }

  /**
   * Get balance for a user
   */
  async getBalance(requesterId: string, userId: string) {
    const requester = await usersRepository.findById(requesterId);
    const user = await usersRepository.findById(userId);

    if (!requester || !user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    if (requester.role !== UserRole.OWNER && requesterId !== userId) {
      const descendants = await usersRepository.findDescendants(requesterId);
      const canView = descendants.some(d => d.id === userId);

      if (!canView) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Cannot view balance for this user');
      }
    }

    const balance = await balancesRepository.findBalanceSummary(userId);

    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Balance not found');
    }

    return balance;
  }
}

export const chipsDomain = new ChipsDomain();
