import {
  Bet,
  BetStatus,
  CreateBetDto,
  BetResult,
  ErrorCode,
  UserRole,
  ChipMovementType,
} from 'helper';
import { betsRepository, HouseReportResult } from './bets.repository';
import { gamesRepository } from '../games/games.repository';
import { balancesRepository } from '../chips/balances.repository';
import { chipMovementsRepository } from '../chips/chip-movements.repository';
import { usersRepository } from '../users/users.repository';
import { gameSimulationService } from './game-simulation.service';
import { AppError } from '../../middleware/error.middleware';

export class BetsDomain {
  /**
   * Place a bet with automatic simulation and settlement
   */
  async placeBet(userId: string, betData: CreateBetDto): Promise<BetResult> {
    // 1. Validate user exists and is active
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, ErrorCode.USER_BLOCKED, 'User is blocked');
    }

    // 2. Validate game exists and is active
    const game = await gamesRepository.findById(betData.gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    if (!game.isActive) {
      throw new AppError(400, ErrorCode.GAME_INACTIVE, 'Game is inactive');
    }

    // 3. Validate bet amount against game limits
    if (!gameSimulationService.validateBetAmount(betData.amount, game)) {
      throw new AppError(
        400,
        ErrorCode.INVALID_BET_AMOUNT,
        `Bet amount must be between ${game.minBet} and ${game.maxBet}`
      );
    }

    // 4. Check user has sufficient balance
    const balance = await balancesRepository.findByUserId(userId);
    if (!balance) {
      throw new AppError(
        404,
        ErrorCode.NOT_FOUND,
        'User balance not found'
      );
    }

    if (balance.chipBalance < betData.amount) {
      throw new AppError(
        400,
        ErrorCode.INSUFFICIENT_BALANCE,
        'Insufficient balance'
      );
    }

    // 5. Run game simulation first
    const simulationResult = gameSimulationService.simulateGameRound(game);

    // 6. Deduct bet amount (create LOSS movement)
    const previousBalance = balance.chipBalance;
    const balanceAfterBet = previousBalance - betData.amount;

    const lossMovement = await chipMovementsRepository.create({
      userId,
      type: ChipMovementType.LOSS,
      amount: betData.amount,
      description: `Bet placed on ${game.name}`,
      previousBalance,
      newBalance: balanceAfterBet,
    });

    // 7. Create bet record and handle payout
    let bet: Bet;
    let prizeMovement = null;
    let finalBalance = balanceAfterBet;

    if (simulationResult.isWin) {
      // Calculate payout
      const payout = gameSimulationService.calculatePayout(
        betData.amount,
        simulationResult.multiplier
      );

      // Create bet record as WON
      bet = await betsRepository.create({
        userId,
        gameId: betData.gameId,
        amount: betData.amount,
        status: BetStatus.WON,
        multiplier: simulationResult.multiplier,
        payout,
        resultData: simulationResult.resultData,
        settledAt: new Date(),
      });

      // Create PRIZE movement
      finalBalance = balanceAfterBet + payout;
      prizeMovement = await chipMovementsRepository.create({
        userId,
        type: ChipMovementType.PRIZE,
        amount: payout,
        description: `Prize from ${game.name} (${simulationResult.multiplier}x)`,
        previousBalance: balanceAfterBet,
        newBalance: finalBalance,
      });
    } else {
      // Create bet record as LOST
      bet = await betsRepository.create({
        userId,
        gameId: betData.gameId,
        amount: betData.amount,
        status: BetStatus.LOST,
        multiplier: 0,
        payout: 0,
        resultData: simulationResult.resultData,
        settledAt: new Date(),
      });
    }

    // 8. Return result
    return {
      bet,
      movement: prizeMovement || lossMovement,
      newBalance: finalBalance,
    };
  }

  /**
   * Get bet history for a user
   */
  async getBetHistory(
    requesterId: string,
    userId: string,
    options: {
      limit: number;
      offset: number;
      gameId?: string;
      status?: string;
    }
  ): Promise<{ bets: Bet[]; total: number }> {
    // Check permission: users can see their own history, admins/cashiers can see their children's history
    await this.validateBetAccessPermission(requesterId, userId);

    return await betsRepository.findByUserId(userId, options);
  }

  /**
   * Get bet statistics for a user
   */
  async getBetStatistics(
    requesterId: string,
    userId: string
  ): Promise<{
    totalBets: number;
    wonBets: number;
    lostBets: number;
    totalWagered: number;
    totalPayout: number;
    netProfit: number;
    winRate: number;
  }> {
    // Check permission
    await this.validateBetAccessPermission(requesterId, userId);

    return await betsRepository.getStatistics(userId);
  }

  /**
   * House-wide report (OWNER only): rounds, wagered, prizes and house balance
   * across native bets + integrator games, with optional filters. When `userId`
   * is given it scopes to that user AND their whole downline (agent view).
   */
  async getHouseReport(
    requesterId: string,
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      providerName?: string;
      gameId?: string;
      userId?: string;
      username?: string;
      limit: number;
      offset: number;
    }
  ): Promise<HouseReportResult> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    if (requester.role !== UserRole.OWNER) {
      throw new AppError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, 'Only OWNER can view the house report');
    }

    // Resolve the target user (by id, or by username typed in the UI). When set,
    // the report scopes to that user AND their whole downline (agent view).
    let targetUserId = filters.userId;
    if (!targetUserId && filters.username) {
      const target = await usersRepository.findByUsername(filters.username);
      if (!target) {
        return { totals: { rounds: 0, wagered: 0, prizes: 0, balance: 0 }, rows: [], total: 0 };
      }
      targetUserId = target.id;
    }

    let userIds: string[] | undefined;
    if (targetUserId) {
      const descendants = await usersRepository.findDescendants(targetUserId);
      userIds = [targetUserId, ...descendants.map(d => d.id)];
    }

    return betsRepository.getHouseReport({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      providerName: filters.providerName,
      gameId: filters.gameId,
      userIds,
      limit: filters.limit,
      offset: filters.offset
    });
  }

  /**
   * Get bet by ID
   */
  async getBetById(requesterId: string, betId: string): Promise<Bet> {
    const bet = await betsRepository.findById(betId);
    if (!bet) {
      throw new AppError(404, ErrorCode.BET_NOT_FOUND, 'Bet not found');
    }

    // Check permission
    await this.validateBetAccessPermission(requesterId, bet.userId);

    return bet;
  }

  /**
   * Get recent bets for a user
   */
  async getRecentBets(
    requesterId: string,
    userId: string,
    limit: number = 10
  ): Promise<Bet[]> {
    // Check permission
    await this.validateBetAccessPermission(requesterId, userId);

    return await betsRepository.findRecentBets(userId, limit);
  }

  /**
   * Validate if requester has permission to access user's bet data
   */
  private async validateBetAccessPermission(
    requesterId: string,
    targetUserId: string
  ): Promise<void> {
    // User can always see their own data
    if (requesterId === targetUserId) {
      return;
    }

    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // OWNER can see all
    if (requester.role === UserRole.OWNER) {
      return;
    }

    // ADMIN/CASHIER can see their descendants
    if (
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.CASHIER
    ) {
      const targetUser = await usersRepository.findById(targetUserId);
      if (!targetUser) {
        throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      // Check if target is descendant of requester
      // Simple check: if target's parentUserId is requester, they're a direct child
      if (targetUser.parentUserId === requesterId) {
        return;
      }

      // TODO: Implement full tree traversal for indirect descendants
    }

    // No permission
    throw new AppError(
      403,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      'Insufficient permissions to access this data'
    );
  }
}

export const betsDomain = new BetsDomain();
