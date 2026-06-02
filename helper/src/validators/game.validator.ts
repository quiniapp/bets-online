import { z } from 'zod';

export const bulkSortOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().nonnegative(),
    })
  ).min(1).max(500),
});

/**
 * Create Game Schema
 */
export const createGameSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    minBet: z.number().positive(),
    maxBet: z.number().positive(),
    houseEdge: z.number().min(0).max(100).optional().default(2.5),
    providerId: z.string().uuid().optional(),
  })
  .refine((data) => data.maxBet > data.minBet, {
    message: 'Maximum bet must be greater than minimum bet',
    path: ['maxBet'],
  });

/**
 * Update Game Schema
 */
export const updateGameSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    isActive: z.boolean().optional(),
    minBet: z.number().positive().optional(),
    maxBet: z.number().positive().optional(),
    houseEdge: z.number().min(0).max(100).optional(),
    sortOrder: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (data) => {
      // If both minBet and maxBet are provided, maxBet must be greater
      if (data.minBet !== undefined && data.maxBet !== undefined) {
        return data.maxBet > data.minBet;
      }
      return true;
    },
    {
      message: 'Maximum bet must be greater than minimum bet',
      path: ['maxBet'],
    }
  );
