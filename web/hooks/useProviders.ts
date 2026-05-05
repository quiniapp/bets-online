import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { Provider, UpdateProviderDto } from 'helper';

export function useProviders(adminMode = false) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const endpoint = adminMode ? '/admin/providers' : '/providers';
    const response = await apiService.get<Provider[]>(endpoint);
    if (response.success && response.data) {
      setProviders(response.data);
    }
    setLoading(false);
  }, [adminMode]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

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
