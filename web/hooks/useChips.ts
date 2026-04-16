import { useState, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { Balance, ChipMovement, PaginationMeta, ChipMovementType } from 'helper';

export function useChips(userId?: string) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [movements, setMovements] = useState<ChipMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = async () => {
    try {
      const endpoint = userId
        ? `/chips/balance/${userId}`
        : '/chips/my-balance';

      const response = await apiService.get<{ balance: Balance }>(endpoint);

      if (response.success && response.data) {
        setBalance(response.data.balance);
      }

      return response;
    } catch (error) {
      console.error('Failed to load balance:', error);
      throw error;
    }
  };

  const loadMovements = async (page = 1, limit = 10) => {
    if (!userId) return;

    setLoading(true);

    try {
      const response = await apiService.get<ChipMovement[]>(
        `/chips/movements/${userId}?page=${page}&limit=${limit}`
      );

      if (response.success && response.data) {
        setMovements(response.data);
        setMeta(response.meta || null);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const sellChips = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/sell', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to sell chips:', error);
      throw error;
    }
  };

  const payPrize = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/prize', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to pay prize:', error);
      throw error;
    }
  };

  const registerLoss = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/loss', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to register loss:', error);
      throw error;
    }
  };

  const withdraw = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/withdraw', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to withdraw:', error);
      throw error;
    }
  };

  const getMovements = useCallback(async (
    targetUserId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', String(options.page));
    if (options?.limit) queryParams.append('limit', String(options.limit));
    if (options?.startDate) queryParams.append('startDate', options.startDate.toISOString());
    if (options?.endDate) queryParams.append('endDate', options.endDate.toISOString());
    if (options?.type) queryParams.append('type', options.type);

    return await apiService.get<ChipMovement[]>(
      `/chips/movements/${targetUserId}?${queryParams.toString()}`
    );
  }, []);

  const exportMovements = useCallback(async (
    targetUserId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (options?.startDate) queryParams.append('startDate', options.startDate.toISOString());
    if (options?.endDate) queryParams.append('endDate', options.endDate.toISOString());
    if (options?.type) queryParams.append('type', options.type);

    // Token via cookie httpOnly (enviada automáticamente por el browser).
    // URL relativa para pasar por el proxy de Next.js.
    const url = `/api/chips/movements/${targetUserId}/export?${queryParams.toString()}`;

    const response = await fetch(url, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to export movements');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `movimientos-${targetUserId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }, []);

  return {
    balance,
    movements,
    meta,
    loading,
    loadBalance,
    loadMovements,
    sellChips,
    payPrize,
    registerLoss,
    withdraw,
    getMovements,
    exportMovements,
  };
}
