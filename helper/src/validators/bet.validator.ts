import { z } from 'zod';

/**
 * Create Bet Schema
 */
export const createBetSchema = z.object({
  gameId: z.string().uuid(),
  amount: z.number().positive(),
});
