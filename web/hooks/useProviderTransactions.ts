'use client';

import { useState, useCallback } from 'react';
import { apiService } from '@/services/api.service';

export interface ProviderTransaction {
  id: string;
  providerName: string;
  providerTransactionId: string;
  providerGameRoundId: string | null;
  providerGameId: string | null;
  userId: string;
  transactionType: string;
  amount: string;
  currency: string;
  balanceAfter: string;
  createdAt: string;
}

interface LoadOptions {
  page?: number;
  limit?: number;
  userId?: string;
  providerName?: string;
}

export function useProviderTransactions() {
  const [transactions, setTransactions] = useState<ProviderTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const load = useCallback(async (opts?: LoadOptions) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (opts?.page) params.set('page', String(opts.page));
      if (opts?.limit) params.set('limit', String(opts.limit));
      if (opts?.userId) params.set('userId', opts.userId);
      if (opts?.providerName) params.set('providerName', opts.providerName);

      const qs = params.toString();
      const response = await apiService.get<ProviderTransaction[]>(
        `/admin/provider-transactions${qs ? '?' + qs : ''}`
      );

      if (response.success && response.data) {
        setTransactions(response.data);
        if (response.meta) setMeta(response.meta);
      } else {
        setError(response.error?.message || 'Error al cargar transacciones');
      }
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de red';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { transactions, loading, error, meta, load };
}
