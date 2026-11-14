import { z } from 'zod';
import { CompensationType, SettlementStatus } from '../types';

/**
 * Update the active compensation mode of a cashier.
 * Only PERCENTAGE is supported for now; the enum leaves room for future modes.
 */
export const updateCashierCompensationSchema = z.object({
  type: z.nativeEnum(CompensationType),
  percentage: z.number().min(0).max(100)
}).refine(data => data.type === CompensationType.PERCENTAGE, {
  message: 'Only PERCENTAGE compensation is supported',
  path: ['type']
});

/**
 * Create a settlement for a cashier period.
 */
export const createCashierSettlementSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notes: z.string().max(1000).optional()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
});

/**
 * Preview a settlement before persisting it.
 */
export const previewCashierSettlementSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
});

/**
 * Pay a pending settlement.
 */
export const payCashierSettlementSchema = z.object({
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Cancel a pending settlement.
 */
export const cancelCashierSettlementSchema = z.object({
  reason: z.string().max(1000).optional()
});

/**
 * Query params for the cashier account list.
 */
export const cashierAccountListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(100).optional()
});

/**
 * Query params for the settlements list.
 */
export const cashierSettlementListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cashierId: z.string().uuid().optional(),
  status: z.nativeEnum(SettlementStatus).optional(),
  search: z.string().max(100).optional()
});
