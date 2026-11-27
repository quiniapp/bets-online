import { z } from 'zod';
import { AdminChipPurchaseStatus, CompensationType, SettlementStatus } from '../types';

/**
 * Update the active compensation mode of a cashier.
 * Only PERCENTAGE is supported for now; the enum leaves room for future modes.
 */
export const updateCashierCompensationSchema = z.object({
  type: z.nativeEnum(CompensationType),
  percentage: z.number().min(0).max(100),
  /** Los premios se descuentan del subtotal. Si se omite, se mantiene el vigente. */
  prizesAffectSubtotal: z.boolean().optional()
}).refine(data => data.type === CompensationType.PERCENTAGE, {
  message: 'Only PERCENTAGE compensation is supported',
  path: ['type']
});

/** Activar o desactivar en todos los cajeros a cargo que los premios se descuenten del subtotal. */
export const bulkPrizesAffectSubtotalSchema = z.object({
  enabled: z.boolean()
});

/**
 * Liquidar a un cajero hasta una fecha de corte.
 * El inicio lo calcula el servidor: el fin de la última liquidación del
 * cajero, o su primer movimiento si nunca se liquidó. periodStart se acepta
 * por compatibilidad y se ignora.
 * collected: cobro de la liquidación (por defecto lo que queda por cobrar);
 * queda pendiente hasta que el owner lo confirma.
 * chipsLeft: fichas no vendidas que se le dejan (por defecto todas).
 */
export const createCashierSettlementSchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date(),
  collected: z.number().finite().min(0).optional(),
  chipsLeft: z.number().finite().min(0).optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Registrar un cobro a cuenta al cajero (antes de liquidar).
 */
export const createCashierCollectionSchema = z.object({
  amount: z.number().finite().positive(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Confirmar el cobro pendiente de una liquidación.
 * amount: lo que se recibió (por defecto, todo lo pendiente).
 */
export const confirmCashierSettlementCollectionSchema = z.object({
  amount: z.number().finite().positive().optional(),
  paymentReference: z.string().max(255).optional()
});

/**
 * Historial de liquidaciones del propio cajero.
 */
export const cashierOwnSettlementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

/**
 * Rango de fechas para la cuenta del owner.
 */
export const cashierPeriodQuerySchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date()
}).refine(data => data.periodEnd > data.periodStart, {
  message: 'Period end must be after period start',
  path: ['periodEnd']
});

/**
 * Fecha de corte de la liquidación (preview y cuenta corriente).
 * periodStart se acepta por compatibilidad y se ignora.
 */
export const cashierCutoffQuerySchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date()
});

/**
 * @deprecated usar cashierCutoffQuerySchema.
 */
export const previewCashierSettlementSchema = cashierCutoffQuerySchema;

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

// ───────────────────────────────────────────────────────────────────────────
// Compra de fichas de admins (owner → admin)
// ───────────────────────────────────────────────────────────────────────────

const adminChipPriceTierSchema = z.object({
  minChips: z.number().finite().positive(),
  percentage: z.number().finite().min(0).max(100)
});

/**
 * Tramos de precio de un admin. Cantidades mínimas distintas.
 */
export const updateAdminChipPricingSchema = z.object({
  tiers: z.array(adminChipPriceTierSchema).min(1).max(20)
}).refine(
  data => new Set(data.tiers.map(tier => tier.minChips)).size === data.tiers.length,
  { message: 'Cada tramo debe tener una cantidad mínima distinta', path: ['tiers'] }
);

/**
 * Cargar fichas a un admin. `percentage` es obligatorio si la carga es menor
 * al primer tramo del admin (lo valida el dominio) e ignorado si no.
 */
export const createAdminChipPurchaseSchema = z.object({
  adminId: z.string().uuid(),
  chips: z.number().finite().positive(),
  percentage: z.number().finite().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(255).optional()
});

export const confirmAdminChipPurchaseSchema = z.object({
  paymentReference: z.string().max(255).optional()
});

export const cancelAdminChipPurchaseSchema = z.object({
  reason: z.string().max(1000).optional()
});

export const adminChipPurchaseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  adminId: z.string().uuid().optional(),
  status: z.nativeEnum(AdminChipPurchaseStatus).optional()
});
