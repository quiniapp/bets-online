import { useState } from 'react';
import { apiService } from '@/services/api.service';
import type { Bet, CreateBetDto, BetStatus } from 'helper';

interface BetStatistics {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
  winRate: number;
}

interface BetHistoryOptions {
  limit?: number;
  offset?: number;
  gameId?: string;
  status?: BetStatus;
}

export function useBets(userId?: string) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [statistics, setStatistics] = useState<BetStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadBets = async (options?: BetHistoryOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.gameId) params.append('gameId', options.gameId);
      if (options?.status) params.append('status', options.status);

      const endpoint = userId
        ? `/bets/history/${userId}${params.toString() ? '?' + params.toString() : ''}`
        : `/bets/my-history${params.toString() ? '?' + params.toString() : ''}`;

      const response = await apiService.get<{
        bets: Bet[];
        total: number;
        limit: number;
        offset: number;
      }>(endpoint);

      if (response.success && response.data) {
        setBets(response.data.bets);
        setTotal(response.data.total);
      } else {
        setError(response.error?.message || 'Failed to load bets');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = userId
        ? `/bets/statistics/${userId}`
        : '/bets/my-statistics';

      const response = await apiService.get<BetStatistics>(endpoint);

      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        setError(response.error?.message || 'Failed to load statistics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async (betData: CreateBetDto) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post<{
        bet: Bet;
        newBalance: number;
        message: string;
      }>('/bets', betData);

      if (response.success && response.data) {
        // Add new bet to the beginning of the list
        setBets([response.data.bet, ...bets]);

        // Update statistics if loaded
        if (statistics) {
          loadStatistics();
        }
      }

      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to place bet');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBetById = async (betId: string) => {
    try {
      const response = await apiService.get<{ bet: Bet }>(`/bets/${betId}`);
      return response;
    } catch (error) {
      console.error('Failed to load bet:', error);
      throw error;
    }
  };

  return {
    bets,
    statistics,
    loading,
    error,
    total,
    placeBet,
    loadBets,
    loadStatistics,
    getBetById,
  };
}
