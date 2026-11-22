import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api.service';
import type {
  CashierPeriodAccount,
  CashierPeriodAccountsResult,
  OwnerAccountSummary
} from 'helper';

/** YYYY-MM-DD en hora local. */
export const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfDayIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
export const endOfDayIso = (value: string) => new Date(`${value}T23:59:59.999`).toISOString();

/**
 * Semana en curso: de domingo a hoy. Como se liquida generalmente los sábados,
 * un sábado devuelve la semana completa (domingo a sábado).
 */
export const currentWeekRange = (today = new Date()) => {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return { from: toDateInput(start), to: toDateInput(today) };
};

/** Hoy, en YYYY-MM-DD local. */
export const todayInput = () => toDateInput(new Date());

/** Query de la fecha de corte: fin del día elegido (el servidor lo recorta a ahora). */
export const cutoffQuery = (cutoff: string) =>
  new URLSearchParams({ periodEnd: endOfDayIso(cutoff) }).toString();

export const periodQuery = (from: string, to: string) =>
  new URLSearchParams({
    periodStart: startOfDayIso(from),
    periodEnd: endOfDayIso(to)
  }).toString();

/**
 * Cuenta corriente de todos los cajeros a una fecha de corte: cada cajero va
 * desde su última liquidación (o su primer movimiento) hasta el corte.
 */
export function useCashierPeriodAccounts(cutoff: string) {
  const [data, setData] = useState<CashierPeriodAccountsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cutoff) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<CashierPeriodAccountsResult>(
        `/cashier-accounts/period?${cutoffQuery(cutoff)}`
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'No se pudo cargar la cuenta corriente');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta corriente');
    } finally {
      setLoading(false);
    }
  }, [cutoff]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    accounts: data?.accounts ?? ([] as CashierPeriodAccount[]),
    loading,
    error,
    reload: load
  };
}

export function useOwnerAccount(from: string, to: string) {
  const [data, setData] = useState<OwnerAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!from || !to || from > to) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<OwnerAccountSummary>(
        `/cashier-accounts/owner?${periodQuery(from, to)}`
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'No se pudo cargar la cuenta del owner');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta del owner');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
