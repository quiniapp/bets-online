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
 * Liquidar un período de un cajero.
 * collected: cobro al cajero (por defecto el total adeudado).
 * chipsLeft: fichas no vendidas que se le dejan (por defecto todas).
 */
export const createCashierSettlementSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  collected: z.number().finite().min(0).optional(),
  chipsLeft: z.number().finite().min(0).optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
});

/**
 * Registrar un cobro posterior sobre una liquidación.
 */
export const collectCashierSettlementSchema = z.object({
  amount: z.number().finite().positive(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Rango de fechas para la cuenta corriente por período y la cuenta del owner.
 */
export const cashierPeriodQuerySchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date()
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

/**
 * Date query for the daily current account (YYYY-MM-DD).
 */
export const cashierDailyAccountQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
});

/**
 * Manual adjustments on a daily current account.
 */
export const updateCashierDailyAccountSchema = z.object({
  claims: z.number().finite().optional(),
  collections: z.number().finite().optional(),
  paid: z.number().finite().optional(),
  leave: z.number().finite().optional()
}).refine(data => Object.values(data).some(value => value !== undefined), {
  message: 'At least one field is required'
});
