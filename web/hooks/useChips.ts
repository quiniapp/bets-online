import { useState } from 'react';
import { apiService } from '@/services/api.service';
import type { Balance, ChipMovement, PaginationMeta } from 'helper';

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

      const response = await apiService.get<Balance>(endpoint);

      if (response.success && response.data) {
        setBalance(response.data);
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
  };
}
