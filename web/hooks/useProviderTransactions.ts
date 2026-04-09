'use client';

import { useState } from 'react';
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
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const load = async (opts?: LoadOptions) => {
    setLoading(true);
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
    }
    setLoading(false);
    return response;
  };

  return { transactions, loading, meta, load };
}
