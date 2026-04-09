import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { Game, CreateGameDto, UpdateGameDto } from 'helper';

export function useGames(activeOnly: boolean = false) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, [activeOnly]);

  const loadGames = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<{ games: Game[]; count: number }>(
        `/games${activeOnly ? '?activeOnly=true' : ''}`
      );

      if (response.success && response.data) {
        setGames(response.data.games);
      } else {
        setError(response.error?.message || 'Failed to load games');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const createGame = async (gameData: CreateGameDto) => {
    try {
      const response = await apiService.post<{ game: Game; message: string }>(
        '/games',
        gameData
      );

      if (response.success && response.data) {
        setGames([...games, response.data.game]);
      }

      return response;
    } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
    }
  };

  const updateGame = async (gameId: string, gameData: UpdateGameDto) => {
    try {
      const response = await apiService.patch<{ game: Game; message: string }>(
        `/games/${gameId}`,
        gameData
      );

      if (response.success && response.data) {
        setGames(games.map((g) => (g.id === gameId ? response.data!.game : g)));
      }

      return response;
    } catch (error) {
      console.error('Failed to update game:', error);
      throw error;
    }
  };

  const toggleGameStatus = async (gameId: string) => {
    try {
      const response = await apiService.post<{ game: Game; message: string }>(
        `/games/${gameId}/toggle-status`
      );

      if (response.success && response.data) {
        setGames(games.map((g) => (g.id === gameId ? response.data!.game : g)));
      }

      return response;
    } catch (error) {
      console.error('Failed to toggle game status:', error);
      throw error;
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const response = await apiService.delete<{ message: string }>(
        `/games/${gameId}`
      );

      if (response.success) {
        setGames(games.filter((g) => g.id !== gameId));
      }

      return response;
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw error;
    }
  };

  const getGameById = async (gameId: string) => {
    try {
      const response = await apiService.get<{ game: Game }>(`/games/${gameId}`);
      return response;
    } catch (error) {
      console.error('Failed to load game:', error);
      throw error;
    }
  };

  const syncGames = async () => {
    const response = await apiService.post<{ synced: number }>(
      '/integrations/21viral/games/sync'
    );
    if (response.success) {
      await loadGames();
    }
    return response;
  };

  return {
    games,
    loading,
    error,
    createGame,
    updateGame,
    toggleGameStatus,
    deleteGame,
    getGameById,
    reload: loadGames,
    syncGames,
  };
}
