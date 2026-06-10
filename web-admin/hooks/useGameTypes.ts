"use client"
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { GameType } from 'helper';
import { typeLabel } from '@/components/admin/casino-settings/type-labels';

/**
 * Game types from /admin/game-types (with display names) for the casino
 * settings editors. `label(name)` resolves displayName → fallback map → raw.
 */
export function useGameTypes() {
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get<GameType[]>('/admin/game-types')
      .then(res => { if (res.success && res.data) setGameTypes(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const label = useCallback(
    (name: string) => typeLabel(name, gameTypes.find(t => t.name === name)?.displayName),
    [gameTypes]
  );

  return { gameTypes, loading, label };
}
