import { z } from 'zod';

/**
 * Replace-all payload for a provider's game-type ordering rules.
 * Empty items array is allowed and clears every rule for the provider.
 */
export const providerTypeOrdersSchema = z.object({
  items: z
    .array(
      z.object({
        gameType: z.string().min(1).max(50),
        sortOrder: z.number().int().nonnegative(),
      })
    )
    .max(100)
    .refine(
      items => new Set(items.map(i => i.gameType)).size === items.length,
      { message: 'Duplicate gameType in items' }
    ),
});
