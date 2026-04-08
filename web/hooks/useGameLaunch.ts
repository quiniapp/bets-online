import { useState } from 'react';
import { apiService } from '@/services/api.service';

interface LaunchGameParams {
  gameId: string;
  playerDeviceType?: 'Desktop' | 'Mobile';
  gameMode?: 'Real' | 'Demo';
  lobbyUrl: string;
  depositUrl: string;
  exitUrl?: string;
}

export function useGameLaunch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchGame = async (params: LaunchGameParams): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post<{ gameStartUrl: string }>(
        `/games/${params.gameId}/launch`,
        {
          playerDeviceType: params.playerDeviceType ?? 'Desktop',
          gameMode: params.gameMode ?? 'Real',
          lobbyUrl: params.lobbyUrl,
          depositUrl: params.depositUrl,
          ...(params.exitUrl ? { exitUrl: params.exitUrl } : {})
        }
      );

      if (response.success && response.data) {
        return response.data.gameStartUrl;
      }

      setError(response.error?.message || 'No se pudo iniciar el juego');
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar el juego';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { launchGame, loading, error };
}
