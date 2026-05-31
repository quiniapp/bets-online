import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { FeaturedGameWithGame, CreateFeaturedGameDto, UpdateFeaturedGameDto } from 'helper';

export function useFeaturedGames() {
  const [items, setItems] = useState<FeaturedGameWithGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const response = await apiService.get<FeaturedGameWithGame[]>('/admin/featured-games');
    if (response.success && response.data) {
      setItems(response.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: CreateFeaturedGameDto) => {
    const response = await apiService.post<{ featuredGame: FeaturedGameWithGame; message: string }>(
      '/admin/featured-games',
      data
    );
    if (response.success) await fetchAll();
    return response;
  };

  const update = async (id: string, data: UpdateFeaturedGameDto) => {
    const response = await apiService.patch<{ featuredGame: FeaturedGameWithGame; message: string }>(
      `/admin/featured-games/${id}`,
      data
    );
    if (response.success) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    }
    return response;
  };

  const remove = async (id: string) => {
    const response = await apiService.delete<{ message: string }>(`/admin/featured-games/${id}`);
    if (response.success) setItems(prev => prev.filter(item => item.id !== id));
    return response;
  };

  const saveOrder = async (ordered: FeaturedGameWithGame[]) => {
    setSaving(true);
    try {
      await Promise.all(
        ordered.map((item, i) => apiService.patch(`/admin/featured-games/${item.id}`, { sortOrder: i + 1 }))
      );
      setItems(ordered.map((item, i) => ({ ...item, sortOrder: i + 1 })));
      return { success: true };
    } catch {
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const maxSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) : 0;

  return { items, setItems, loading, saving, fetchAll, create, update, remove, saveOrder, maxSortOrder };
}
