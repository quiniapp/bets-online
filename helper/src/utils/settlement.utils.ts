import type { CashierSettlement } from '../types';

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

type SettlementAmounts = Pick<
  CashierSettlement,
  'collected' | 'onAccountCollected' | 'pendingCollection' | 'totalDue' | 'subtotal'
>;

/**
 * Cobro fijado al liquidar (sin los cobros a cuenta): lo ya confirmado más lo
 * que sigue pendiente de confirmar.
 */
export const settlementCollectionAmount = (settlement: SettlementAmounts): number =>
  round2(
    (settlement.collected ?? 0) -
      (settlement.onAccountCollected ?? 0) +
      (settlement.pendingCollection ?? 0)
  );

/** Total a cobrar al liquidar: saldo anterior + subtotal − cobros a cuenta. */
export const settlementAmountDue = (settlement: SettlementAmounts): number =>
  round2((settlement.totalDue ?? settlement.subtotal ?? 0) - (settlement.onAccountCollected ?? 0));
