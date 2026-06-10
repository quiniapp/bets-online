"use client"
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { CasinoSettings } from 'helper';

const DEFAULT_HEADER_CATEGORIES = [
  'videoSlots', 'LiveGames', 'CrashGame', 'Roulette', 'Blackjack',
];

export function useCasinoSettings() {
  const [settings, setSettings] = useState<CasinoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get<CasinoSettings>('/settings/casino')
      .then(res => { if (res.success && res.data) setSettings(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return {
    headerCategories: settings?.headerCategories ?? DEFAULT_HEADER_CATEGORIES,
    lobbySlots: settings?.lobbySlots ?? [],
    footerLinks: settings?.footerLinks ?? [],
    bottomNavItems: settings?.bottomNavItems ?? [],
    loading,
  };
}
