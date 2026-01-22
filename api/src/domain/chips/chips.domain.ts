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

export class ChipsDomain {
  /**
   * Sell chips from cashier/admin to player
   */
  async sellChips(
    sellerId: string,
    playerId: string,
    amount: number,
    description?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    // Get seller and player
    const seller = await usersRepository.findById(sellerId);
    const player = await usersRepository.findById(playerId);

    if (!seller || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Verify seller can sell to this player
    if (player.parentUserId !== sellerId) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Can only sell chips to players you registered'
      );
    }

    // Get player balance
    const balance = await balancesRepository.findByUserId(playerId);
    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
    }

    // Create movement
    const movement = await chipMovementsRepository.create({
      userId: playerId,
      relatedUserId: sellerId,
      type: ChipMovementType.SELL_TO_PLAYER,
      amount,
      description,
      previousBalance: balance.chipBalance,
      newBalance: balance.chipBalance + amount
    });

    // Update balance
    await balancesRepository.incrementBalance(playerId, amount);

    return movement;
  }

  /**
   * Pay prize to player
   */
  async payPrize(
    cashierId: string,
    playerId: string,
    amount: number,
    description?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    // Get cashier and player
    const cashier = await usersRepository.findById(cashierId);
    const player = await usersRepository.findById(playerId);

    if (!cashier || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Verify cashier can pay prize to this player
    if (player.parentUserId !== cashierId) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Can only pay prizes to players you registered'
      );
    }

    // Get player balance
    const balance = await balancesRepository.findByUserId(playerId);
    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
    }

    // Create movement
    const movement = await chipMovementsRepository.create({
      userId: playerId,
      relatedUserId: cashierId,
      type: ChipMovementType.PRIZE,
      amount,
      description,
      previousBalance: balance.chipBalance,
      newBalance: balance.chipBalance + amount
    });

    // Update balance
    await balancesRepository.incrementBalance(playerId, amount);

    return movement;
  }

  /**
   * Register a loss for player
   */
  async registerLoss(
    cashierId: string,
    playerId: string,
    amount: number,
    description?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    // Get cashier and player
    const cashier = await usersRepository.findById(cashierId);
    const player = await usersRepository.findById(playerId);

    if (!cashier || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Verify cashier manages this player
    if (player.parentUserId !== cashierId) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Can only register losses for players you registered'
      );
    }

    // Get player balance
    const balance = await balancesRepository.findByUserId(playerId);
    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
    }

    if (balance.chipBalance < amount) {
      throw new AppError(
        400,
        ErrorCode.INSUFFICIENT_BALANCE,
        'Insufficient balance'
      );
    }

    // Create movement (negative amount)
    const movement = await chipMovementsRepository.create({
      userId: playerId,
      relatedUserId: cashierId,
      type: ChipMovementType.LOSS,
      amount: -amount,
      description,
      previousBalance: balance.chipBalance,
      newBalance: balance.chipBalance - amount
    });

    // Update balance
    await balancesRepository.decrementBalance(playerId, amount);

    return movement;
  }

  /**
   * Withdraw chips (player cashing out)
   */
  async withdraw(
    requesterId: string,
    playerId: string,
    amount: number,
    description?: string
  ): Promise<ChipMovement> {
    if (amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Amount must be positive');
    }

    // Get requester and player
    const requester = await usersRepository.findById(requesterId);
    const player = await usersRepository.findById(playerId);

    if (!requester || !player) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Verify requester can process withdrawal
    if (player.parentUserId !== requesterId && requesterId !== playerId) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Cannot process withdrawal for this user'
      );
    }

    // Get player balance
    const balance = await balancesRepository.findByUserId(playerId);
    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Player balance not found');
    }

    if (balance.chipBalance < amount) {
      throw new AppError(
        400,
        ErrorCode.INSUFFICIENT_BALANCE,
        'Insufficient balance'
      );
    }

    // Create movement
    const movement = await chipMovementsRepository.create({
      userId: playerId,
      relatedUserId: requesterId,
      type: ChipMovementType.WITHDRAWAL,
      amount: -amount,
      description,
      previousBalance: balance.chipBalance,
      newBalance: balance.chipBalance - amount
    });

    // Update balance
    await balancesRepository.decrementBalance(playerId, amount);

    return movement;
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
    }
  ): Promise<{ movements: ChipMovement[]; total: number; page: number; limit: number }> {
    // Verify requester can view this user's movements
    const requester = await usersRepository.findById(requesterId);
    const user = await usersRepository.findById(userId);

    if (!requester || !user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Owner can see everything, others can only see their subtree
    if (requester.role !== UserRole.OWNER && requesterId !== userId) {
      const descendants = await usersRepository.findDescendants(requesterId);
      const canView = descendants.some(d => d.id === userId);

      if (!canView) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot view movements for this user'
        );
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
      type: options?.type
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
    // Verify requester can view this user's balance
    const requester = await usersRepository.findById(requesterId);
    const user = await usersRepository.findById(userId);

    if (!requester || !user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Owner can see everything, others can only see their subtree or themselves
    if (requester.role !== UserRole.OWNER && requesterId !== userId) {
      const descendants = await usersRepository.findDescendants(requesterId);
      const canView = descendants.some(d => d.id === userId);

      if (!canView) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot view balance for this user'
        );
      }
    }

    const balance = await balancesRepository.findByUserId(userId);

    if (!balance) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Balance not found');
    }

    return balance;
  }
}

export const chipsDomain = new ChipsDomain();
