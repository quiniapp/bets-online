import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { Game, CreateGameDto, UpdateGameDto } from 'helper';

interface UseGamesOptions {
  activeOnly?: boolean;
  providerName?: string | null;
  search?: string;
  gameType?: string | null;
}

export function useGames(activeOnlyOrOptions: boolean | UseGamesOptions = false, providerName: string | null = null) {
  const options: UseGamesOptions = typeof activeOnlyOrOptions === 'boolean'
    ? { activeOnly: activeOnlyOrOptions, providerName }
    : activeOnlyOrOptions;

  const activeOnly = options.activeOnly ?? false;
  const provider = options.providerName ?? null;
  const search = options.search ?? '';
  const gameType = options.gameType ?? null;

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const hasMore = page < totalPages;

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const qs = new URLSearchParams({ page: String(targetPage), limit: '24' });
        if (activeOnly) qs.set('activeOnly', 'true');
        if (provider) qs.set('providerName', provider);
        if (search) qs.set('search', search);
        if (gameType) qs.set('gameType', gameType);

        const response = await apiService.get<Game[]>(`/games?${qs.toString()}`);

        if (response.success && response.data) {
          setGames(prev => replace ? response.data! : [...prev, ...response.data!]);
          setPage(response.meta?.page ?? targetPage);
          setTotalPages(response.meta?.totalPages ?? 1);
          setTotal(response.meta?.total ?? 0);
        } else {
          setError(response.error?.message || 'Failed to load games');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load games');
      } finally {
        if (replace) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [activeOnly, provider, search, gameType]
  );

  useEffect(() => {
    setGames([]);
    setPage(1);
    setTotalPages(1);
    fetchPage(1, true);
  }, [activeOnly, provider, search, gameType, fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(page + 1, false);
    }
  }, [loadingMore, hasMore, page, fetchPage]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage >= 1 && targetPage <= totalPages) {
        fetchPage(targetPage, true);
      }
    },
    [totalPages, fetchPage]
  );

  const reload = useCallback(() => {
    setGames([]);
    setPage(1);
    setTotalPages(1);
    fetchPage(1, true);
  }, [fetchPage]);

  const createGame = async (gameData: CreateGameDto) => {
    const response = await apiService.post<{ game: Game; message: string }>('/games', gameData);
    if (response.success) reload();
    return response;
  };

  const updateGame = async (gameId: string, gameData: UpdateGameDto) => {
    const response = await apiService.patch<{ game: Game; message: string }>(
      `/games/${gameId}`,
      gameData
    );
    if (response.success) reload();
    return response;
  };

  const toggleGameStatus = async (gameId: string) => {
    const response = await apiService.post<{ game: Game; message: string }>(
      `/games/${gameId}/toggle-status`
    );
    if (response.success) reload();
    return response;
  };

  const deleteGame = async (gameId: string) => {
    const response = await apiService.delete<{ message: string }>(`/games/${gameId}`);
    if (response.success) reload();
    return response;
  };

  const getGameById = async (gameId: string) => {
    return apiService.get<{ game: Game }>(`/games/${gameId}`);
  };

  const syncGames = async () => {
    const response = await apiService.post<{ synced: number }>('/integrations/21viral/games/sync');
    if (response.success) reload();
    return response;
  };

  return {
    games,
    loading,
    loadingMore,
    error,
    page,
    totalPages,
    total,
    hasMore,
    loadMore,
    goToPage,
    reload,
    createGame,
    updateGame,
    toggleGameStatus,
    deleteGame,
    getGameById,
    syncGames,
  };
}
