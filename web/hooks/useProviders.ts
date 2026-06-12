import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import { useLobby } from '@/contexts/lobby-context';
import type { Provider, UpdateProviderDto } from 'helper';

export function useProviders(adminMode = false) {
  // Under LobbyProvider the aggregated /lobby payload already includes the
  // public providers list — no own request unless the lobby fetch failed.
  const lobby = useLobby();
  const lobbyActive = !adminMode && !!lobby && (lobby.loading || lobby.data !== null);

  const [ownProviders, setOwnProviders] = useState<Provider[]>([]);
  const [ownLoading, setOwnLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProviders = useCallback(async () => {
    setOwnLoading(true);
    const endpoint = adminMode ? '/admin/providers' : '/providers';
    const response = await apiService.get<Provider[]>(endpoint);
    if (response.success && response.data) {
      setOwnProviders(response.data);
    }
    setOwnLoading(false);
  }, [adminMode]);

  useEffect(() => {
    if (lobbyActive) return;
    fetchProviders();
  }, [fetchProviders, lobbyActive]);

  const providers = lobbyActive ? (lobby!.data?.providers ?? []) : ownProviders;
  const loading = lobbyActive ? lobby!.loading : ownLoading;
  const setProviders = setOwnProviders;

  const updateProvider = async (name: string, data: UpdateProviderDto) => {
    return apiService.patch<{ provider: Provider; message: string }>(`/admin/providers/${name}`, data);
  };

  const saveOrder = async (ordered: Provider[]) => {
    setSaving(true);
    try {
      await Promise.all(
        ordered.map((p, i) => apiService.patch(`/admin/providers/${p.name}`, { sortOrder: i + 1 }))
      );
      setProviders(ordered.map((p, i) => ({ ...p, sortOrder: i + 1 })));
      return { success: true };
    } catch {
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  return { providers, setProviders, loading, saving, fetchProviders, updateProvider, saveOrder };
}
