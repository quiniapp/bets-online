"use client"
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { CasinoSettings, UpdateCasinoSettingsDto } from 'helper';

export function useCasinoSettings() {
  const [settings, setSettings] = useState<CasinoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get<CasinoSettings>('/settings/casino');
      if (res.success && res.data) setSettings(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: UpdateCasinoSettingsDto): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await apiService.patch<CasinoSettings>('/settings/casino', patch);
      if (res.success && res.data) {
        setSettings(res.data);
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, save, reload: load };
}
