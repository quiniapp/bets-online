import Decimal from 'decimal.js';
import { Transaction } from 'sequelize';
import {
  ProviderTransactionRequest,
  ProviderTransactionResponse,
  ViralErrorCode,
  TransactionType,
  ChipMovementType
} from 'helper';
import { sequelize } from '../../../config/sequelize';
import { ViralError } from './balance.domain';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';
import { providerTransactionRepository } from '../../../persistence/repositories/providerTransaction.repository';
import { chipMovementsRepository } from '../../../persistence/repositories/chip-movements.repository';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export class TransactionsDomain {
  async processTransaction(req: ProviderTransactionRequest): Promise<ProviderTransactionResponse> {
    // 1. Find provider profile
    const profile = await userProviderProfileRepository.findByProviderPlayerId('21viral', req.playerId);
    if (!profile) throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player profile not found');

    // 2. Check user status
    const user = await usersRepository.findById(profile.userId);
    if (!user) throw new ViralError(ViralErrorCode.PlayerNotActive, 'User not found');
    if (user.status === 'BLOCKED') throw new ViralError(ViralErrorCode.PlayerBlocked, 'Player is blocked');
    if (user.status !== 'ACTIVE') throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player is not active');

    // 3. Check is_active
    if (!profile.isActive) throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player provider profile is inactive');

    // 4. Check currency mismatch
    if (req.currency && req.currency !== profile.currency) {
      throw new ViralError(ViralErrorCode.CurrencyMismatch, `Currency mismatch: expected ${profile.currency}, got ${req.currency}`);
    }

    // 5. Idempotency check (outside transaction — read-only)
    const existing = await providerTransactionRepository.findByIdempotencyKey(
      '21viral',
      req.providerTransactionId,
      req.transactionType
    );

    if (existing) {
      if (new Decimal(existing.amount).equals(new Decimal(req.amount))) {
        return {
          balance: existing.balanceAfter,
          currency: profile.currency,
          operatorTransactionId: existing.id,
          alreadyProcessed: true
        };
      }
      throw new ViralError(
        ViralErrorCode.DoubleTransactionWithDifferentAmount,
        'Same transaction ID with different amount'
      );
    }

    // 6. Execute inside DB transaction
    try {
      return await sequelize.transaction(async (t: Transaction) => {
        return this.executeTransaction(req, profile, t);
      });
    } catch (error: unknown) {
      // Race condition: unique constraint violation
      if (
        error &&
        typeof error === 'object' &&
        'parent' in error &&
        (error as { parent: { code: string } }).parent?.code === POSTGRES_UNIQUE_VIOLATION
      ) {
        const existingAfterRace = await providerTransactionRepository.findByIdempotencyKey(
          '21viral',
          req.providerTransactionId,
          req.transactionType
        );
        if (existingAfterRace) {
          if (!new Decimal(existingAfterRace.amount).equals(new Decimal(req.amount))) {
            throw new ViralError(
              ViralErrorCode.DoubleTransactionWithDifferentAmount,
              'Same transaction ID with different amount'
            );
          }
          return {
            balance: existingAfterRace.balanceAfter,
            currency: profile.currency,
            operatorTransactionId: existingAfterRace.id,
            alreadyProcessed: true
          };
        }
      }
      throw error;
    }
  }

  private async executeTransaction(
    req: ProviderTransactionRequest,
    profile: { userId: string; providerPlayerId: string; currency: string },
    t: Transaction
  ): Promise<ProviderTransactionResponse> {
    const balance = await balancesRepository.findByUserIdWithLock(profile.userId, t);
    if (!balance) throw new ViralError(ViralErrorCode.GeneralFailure, 'Balance not found');

    const currentBalance = new Decimal(balance.chipBalance);
    const amount = new Decimal(req.amount);
    let newBalance: Decimal;

    if (req.transactionType === TransactionType.Debit) {
      if (currentBalance.lessThan(amount)) {
        throw new ViralError(ViralErrorCode.InsufficientFunds, 'Insufficient balance');
      }
      newBalance = currentBalance.minus(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    } else if (req.transactionType === TransactionType.Credit) {
      newBalance = currentBalance.plus(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    } else {
      // REVERSAL
      const original = await providerTransactionRepository.findOriginalForReversal(
        '21viral',
        req.providerTransactionId,
        t
      );

      if (!original) throw new ViralError(ViralErrorCode.GameRoundNotFound, 'Original transaction not found');

      const originalAmount = new Decimal(original.amount);

      if (original.transactionType === TransactionType.Debit) {
        newBalance = currentBalance.plus(originalAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      } else {
        // Credit reversal — clamp to 0
        newBalance = Decimal.max(
          currentBalance.minus(originalAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
          new Decimal(0)
        );
      }
    }

    const newBalanceStr = newBalance.toFixed(2);

    await balancesRepository.updateChipBalance(profile.userId, newBalanceStr, t);

    const tx = await providerTransactionRepository.create(
      {
        providerName: '21viral',
        providerTransactionId: req.providerTransactionId,
        providerGameRoundId: req.providerGameRoundId ?? null,
        providerGameId: req.providerGameId ?? null,
        providerPlayerId: profile.providerPlayerId,
        userId: profile.userId,
        transactionType: req.transactionType,
        betType: req.betType ?? null,
        gameRoundStatus: req.gameRoundStatus ?? null,
        amount: req.amount,
        currency: req.currency ?? profile.currency,
        balanceAfter: newBalanceStr,
        betOutcomeEventData: req.betOutcomeEventData ?? null
      },
      t
    );

    const chipMovementType =
      req.transactionType === TransactionType.Debit
        ? ChipMovementType.GAME_BET
        : req.transactionType === TransactionType.Credit
          ? ChipMovementType.GAME_WIN
          : ChipMovementType.GAME_REFUND;

    await chipMovementsRepository.create(
      {
        userId: profile.userId,
        type: chipMovementType,
        amount: parseFloat(req.amount),
        previousBalance: currentBalance.toNumber(),
        newBalance: parseFloat(newBalanceStr),
        description: req.providerGameRoundId
          ? `Round: ${req.providerGameRoundId}`
          : undefined
      },
      t
    );

    return {
      balance: newBalanceStr,
      currency: profile.currency,
      operatorTransactionId: tx.id
    };
  }
}

export const transactionsDomain = new TransactionsDomain();
