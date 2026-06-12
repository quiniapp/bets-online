"use client"
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import { useLobby } from '@/contexts/lobby-context';
import type { CasinoSettings } from 'helper';

const DEFAULT_HEADER_CATEGORIES = [
  'videoSlots', 'LiveGames', 'CrashGame', 'Roulette', 'Blackjack',
];

// Module-level cache: page.tsx, CategoriesBar and Footer all mount this hook —
// they share one /settings/casino request per page load.
let cache: CasinoSettings | Promise<CasinoSettings | null> | null = null;

function fetchSettings(): Promise<CasinoSettings | null> {
  if (cache !== null) {
    return cache instanceof Promise ? cache : Promise.resolve(cache);
  }
  const promise = apiService.get<CasinoSettings>('/settings/casino')
    .then(res => {
      if (res.success && res.data) {
        cache = res.data;
        return res.data;
      }
      cache = null;
      return null;
    })
    .catch(() => {
      cache = null;
      return null;
    });
  cache = promise;
  return promise;
}

export function useCasinoSettings() {
  // Under LobbyProvider the aggregated /lobby payload already includes the
  // settings — no own request unless the lobby fetch failed.
  const lobby = useLobby();
  const lobbyActive = !!lobby && (lobby.loading || lobby.data !== null);

  const initial = cache !== null && !(cache instanceof Promise) ? cache : null;
  const [ownSettings, setOwnSettings] = useState<CasinoSettings | null>(initial);
  const [ownLoading, setOwnLoading] = useState(initial === null);

  useEffect(() => {
    if (lobbyActive) return;
    let active = true;
    fetchSettings().then(s => {
      if (active) {
        if (s) setOwnSettings(s);
        setOwnLoading(false);
      }
    });
    return () => { active = false; };
  }, [lobbyActive]);

  const settings = lobbyActive ? (lobby!.data?.settings ?? null) : ownSettings;
  const loading = lobbyActive ? lobby!.loading : ownLoading;

  return {
    headerCategories: settings?.headerCategories ?? DEFAULT_HEADER_CATEGORIES,
    lobbySlots: settings?.lobbySlots ?? [],
    footerLinks: settings?.footerLinks ?? [],
    bottomNavItems: settings?.bottomNavItems ?? [],
    loading,
  };
}
