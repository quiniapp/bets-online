import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api.service';
import type {
  CashierAccountSummary,
  CashierAccountsListResult,
  CashierAccountsSummary,
  CashierSettlementWithCashier,
  PaginationMeta,
  SettlementStatus
} from 'helper';

interface UseCashierAccountsOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoLoad?: boolean;
}

const EMPTY_SUMMARY: CashierAccountsSummary = {
  totalCashiers: 0,
  totalSales: 0,
  totalPrizes: 0,
  totalProfit: 0,
  pendingAmount: 0,
  paidAmount: 0,
  openCommission: 0,
  balanceDue: 0
};

export function useCashierAccounts(options: UseCashierAccountsOptions = {}) {
  const { page = 1, limit = 20, search, autoLoad = true } = options;

  const [accounts, setAccounts] = useState<CashierAccountSummary[]>([]);
  const [summary, setSummary] = useState<CashierAccountsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadAccounts = useCallback(async (params?: { page?: number; limit?: number; search?: string }) => {
    const queryPage = params?.page ?? page;
    const queryLimit = params?.limit ?? limit;
    const querySearch = params?.search ?? search;

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.append('page', String(queryPage));
      query.append('limit', String(queryLimit));
      if (querySearch) query.append('search', querySearch);

      const response = await apiService.get<CashierAccountsListResult>(
        `/cashier-accounts?${query.toString()}`
      );

      if (response.success && response.data) {
        setAccounts(response.data.accounts);
        setSummary(response.data.summary);
        setPagination(response.meta ?? null);
      } else {
        setError(response.error?.message || 'No se pudieron cargar las cuentas');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    if (autoLoad) loadAccounts();
  }, [loadAccounts, autoLoad]);

  return { accounts, summary, loading, error, pagination, reload: loadAccounts };
}

interface UseCashierSettlementsOptions {
  page?: number;
  limit?: number;
  status?: SettlementStatus;
  cashierId?: string;
  search?: string;
  autoLoad?: boolean;
}

export function useCashierSettlements(options: UseCashierSettlementsOptions = {}) {
  const { page = 1, limit = 20, status, cashierId, search, autoLoad = true } = options;

  const [settlements, setSettlements] = useState<CashierSettlementWithCashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadSettlements = useCallback(async (params?: {
    page?: number;
    limit?: number;
    status?: SettlementStatus;
    cashierId?: string;
    search?: string;
  }) => {
    const queryPage = params?.page ?? page;
    const queryLimit = params?.limit ?? limit;
    const queryStatus = params?.status ?? status;
    const queryCashierId = params?.cashierId ?? cashierId;
    const querySearch = params?.search ?? search;

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.append('page', String(queryPage));
      query.append('limit', String(queryLimit));
      if (queryStatus) query.append('status', queryStatus);
      if (queryCashierId) query.append('cashierId', queryCashierId);
      if (querySearch) query.append('search', querySearch);

      const response = await apiService.get<CashierSettlementWithCashier[]>(
        `/cashier-accounts/settlements?${query.toString()}`
      );

      if (response.success && response.data) {
        setSettlements(response.data);
        setPagination(response.meta ?? null);
      } else {
        setError(response.error?.message || 'No se pudieron cargar las liquidaciones');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las liquidaciones');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, cashierId, search]);

  useEffect(() => {
    if (autoLoad) loadSettlements();
  }, [loadSettlements, autoLoad]);

  return { settlements, loading, error, pagination, reload: loadSettlements };
}
