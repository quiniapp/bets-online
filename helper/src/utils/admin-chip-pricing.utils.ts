import type { AdminChipPriceTier } from '../types';

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Tramos ordenados por cantidad mínima ascendente. */
export const sortAdminChipTiers = (tiers: ReadonlyArray<AdminChipPriceTier>): AdminChipPriceTier[] =>
  [...tiers].sort((a, b) => a.minChips - b.minChips);

/** Tramo que corresponde a una carga: el de mayor mínimo que no la supere. */
export const findAdminChipTier = (
  tiers: ReadonlyArray<AdminChipPriceTier>,
  chips: number
): AdminChipPriceTier | null => {
  let match: AdminChipPriceTier | null = null;
  for (const tier of sortAdminChipTiers(tiers)) {
    if (chips >= tier.minChips) match = tier;
  }
  return match;
};

export interface AdminChipQuote {
  /** null si la carga es menor al primer tramo y no se pasó un porcentaje */
  percentage: number | null;
  amount: number | null;
  tier: AdminChipPriceTier | null;
  /** La carga es menor al primer tramo: el porcentaje va a mano */
  requiresManualPercentage: boolean;
}

/**
 * Precio de una carga de fichas a un admin. Desde el primer tramo se aplica
 * el porcentaje del tramo; por debajo, el `manualPercentage` recibido.
 */
export const quoteAdminChipPurchase = (
  tiers: ReadonlyArray<AdminChipPriceTier>,
  chips: number,
  manualPercentage?: number | null
): AdminChipQuote => {
  const tier = findAdminChipTier(tiers, chips);
  if (tier) {
    return {
      percentage: tier.percentage,
      amount: round2((chips * tier.percentage) / 100),
      tier,
      requiresManualPercentage: false
    };
  }
  const hasManual = manualPercentage !== null && manualPercentage !== undefined;
  return {
    percentage: hasManual ? manualPercentage : null,
    amount: hasManual ? round2((chips * manualPercentage) / 100) : null,
    tier: null,
    requiresManualPercentage: true
  };
};
