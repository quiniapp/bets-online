import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api.service';
import type {
  CashierDailyAccountsResult,
  CashierDailyAccount
} from 'helper';

export function useCashierDailyAccounts(date: string) {
  const [data, setData] = useState<CashierDailyAccountsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetDate?: string) => {
    const queryDate = targetDate ?? date;
    if (!queryDate) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<CashierDailyAccountsResult>(
        `/cashier-accounts/daily?date=${encodeURIComponent(queryDate)}`
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'No se pudo cargar la cuenta corriente diaria');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta corriente diaria');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    accounts: data?.accounts ?? [] as CashierDailyAccount[],
    totals: data?.totals ?? null,
    loading,
    error,
    reload: load
  };
}
