// Validation utilities using Zod
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

export const betAmountSchema = z.number()
  .positive('Bet amount must be positive')
  .max(10000, 'Bet amount cannot exceed 10,000');

export const balanceAdjustmentSchema = z.object({
  amount: z.number(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
});

export const gameSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  minBet: z.number().positive(),
  maxBet: z.number().positive(),
  isActive: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UsernameInput = z.infer<typeof usernameSchema>;
export type BetAmountInput = z.infer<typeof betAmountSchema>;
export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>;
export type GameInput = z.infer<typeof gameSchema>;