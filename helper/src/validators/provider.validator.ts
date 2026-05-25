import { z } from 'zod';
import { TransactionType, BetType, GameRoundStatus, AwardType, JackpotType, ReversalOfType } from '../types/provider.types';

const betOutcomeWinSchema = z.object({
  amount: z.string(),
  awardType: z.nativeEnum(AwardType),
  id: z.string(),
  type: z.nativeEnum(JackpotType).optional()
});

export const betOutcomeEventDataSchema = z
  .object({
    jackpotWins: z.array(betOutcomeWinSchema).optional(),
    tournamentWins: z.array(betOutcomeWinSchema).optional(),
    campaignWins: z.array(betOutcomeWinSchema).optional(),
    cashBonusWins: z.array(betOutcomeWinSchema).optional(),
    reversalOfType: z.nativeEnum(ReversalOfType).optional()
  })
  .optional();

export const providerBalanceRequestSchema = z.object({
  token: z.string(),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string')
});

export const providerTransactionRequestSchema = z.object({
  transactionType: z.nativeEnum(TransactionType),
  betType: z.nativeEnum(BetType),
  gameRoundStatus: z.nativeEnum(GameRoundStatus).optional(),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string'),
  token: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'amount must be a numeric string'),
  currency: z.string().length(3).optional(),
  providerGameRoundId: z.string(),
  providerTransactionId: z.string(),
  betOutcomeEventData: betOutcomeEventDataSchema
});
