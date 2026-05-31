"use client"
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';

interface WeeklyChipFlow {
  date: string;
  loaded: number;
  withdrawn: number;
}

export interface AdminStatsOverview {
  onlineNow: number;
  newUsersToday: number;
  activeUsersToday: number;
  weeklyChipFlow: WeeklyChipFlow[];
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get<AdminStatsOverview>('/admin/stats/overview');
      if (res.success && res.data) setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, reload: load };
}
