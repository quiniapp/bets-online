"use client"
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { ProviderTypeOrderItem } from 'helper';

/**
 * Effective game-type order of a provider (GET) + replace-all save (PUT).
 * Saving writes a rule for EVERY listed type so none falls back to the
 * global order and interleaves unexpectedly.
 */
export function useProviderTypeOrders(providerName: string | null) {
  const [types, setTypes] = useState<ProviderTypeOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!providerName) {
      setTypes([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.get<{ items: ProviderTypeOrderItem[] }>(
        `/admin/providers/${encodeURIComponent(providerName)}/type-orders`
      );
      if (res.success && res.data) setTypes(res.data.items);
    } finally {
      setLoading(false);
    }
  }, [providerName]);

  useEffect(() => { load(); }, [load]);

  const saveOrder = useCallback(async (ordered: ProviderTypeOrderItem[]): Promise<boolean> => {
    if (!providerName) return false;
    setSaving(true);
    try {
      const res = await apiService.put<{ items: ProviderTypeOrderItem[] }>(
        `/admin/providers/${encodeURIComponent(providerName)}/type-orders`,
        { items: ordered.map((t, i) => ({ gameType: t.gameType, sortOrder: i })) }
      );
      if (res.success && res.data) {
        setTypes(res.data.items);
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [providerName]);

  return { types, setTypes, loading, saving, saveOrder, reload: load };
}
