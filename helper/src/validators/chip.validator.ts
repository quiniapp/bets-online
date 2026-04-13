import { z } from 'zod';
import { ChipMovementType, CompensationType, RecoveryMode } from '../types';

/**
 * Create Chip Movement Schema
 */
export const createChipMovementSchema = z.object({
  userId: z.string().uuid(),
  relatedUserId: z.string().uuid().optional(),
  type: z.nativeEnum(ChipMovementType),
  amount: z.number(),
  description: z.string().optional()
});

/**
 * Sell Chips Schema
 */
export const sellChipsSchema = z.object({
  playerId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  idempotencyKey: z.string().min(1).max(255).optional()
});

/**
 * Pay Prize Schema
 */
export const payPrizeSchema = z.object({
  playerId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  idempotencyKey: z.string().min(1).max(255).optional()
});

/**
 * Create Compensation Mode Schema
 */
export const createCompensationModeSchema = z.object({
  cashierId: z.string().uuid(),
  type: z.nativeEnum(CompensationType),
  percentage: z.number().min(0).max(100).optional()
}).refine(
  data => {
    if (data.type === CompensationType.PERCENTAGE) {
      return data.percentage !== undefined;
    }
    return true;
  },
  {
    message: 'Percentage is required for PERCENTAGE compensation type',
    path: ['percentage']
  }
);

/**
 * Create Panel Schema
 */
export const createPanelSchema = z.object({
  cashierId: z.string().uuid(),
  buyPricePerChip: z.number().positive(),
  sellPricePerChip: z.number().positive(),
  totalChips: z.number().int().positive()
}).refine(data => data.sellPricePerChip > data.buyPricePerChip, {
  message: 'Sell price must be greater than buy price',
  path: ['sellPricePerChip']
});

/**
 * Create Recovery Schema
 */
export const createRecoverySchema = z.object({
  adminId: z.string().uuid(),
  cashierId: z.string().uuid(),
  relatedMovementId: z.string().uuid().optional(),
  amount: z.number().positive(),
  recoveryMode: z.nativeEnum(RecoveryMode)
});

/**
 * Create Settlement Schema
 */
export const createSettlementSchema = z.object({
  cashierId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
});
