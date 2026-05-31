import { useState } from 'react';
import { apiService } from '@/services/api.service';
import type { ChipMovement, ChipMovementType } from 'helper';

interface TransactionOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  type?: ChipMovementType;
  includeDescendants?: boolean;
}

export function useTransactions(userId?: string) {
  const [transactions, setTransactions] = useState<ChipMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadTransactions = async (options?: TransactionOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.startDate)
        params.append('startDate', options.startDate.toISOString());
      if (options?.endDate)
        params.append('endDate', options.endDate.toISOString());
      if (options?.type) params.append('type', options.type);
      if (options?.includeDescendants) params.append('includeDescendants', 'true');

      const endpoint = userId
        ? `/chips/movements/${userId}${params.toString() ? '?' + params.toString() : ''}`
        : `/chips/movements/me${params.toString() ? '?' + params.toString() : ''}`;

      const response = await apiService.get<ChipMovement[]>(endpoint);

      if (response.success && response.data) {
        setTransactions(response.data);
        if (response.meta) {
          setMeta(response.meta);
        }
      } else {
        setError(response.error?.message || 'Failed to load transactions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions,
    meta,
    loading,
    error,
    loadTransactions,
  };
}
