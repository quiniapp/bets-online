"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiService } from '@/services/api.service';
import type { LobbyData } from 'helper';

/**
 * Aggregated lobby payload (GET /api/lobby): one request instead of ~10
 * (settings, types, providers, featured + one per lobby slot). Hooks like
 * useCasinoSettings/useGameTypes/useProviders read from this context when
 * mounted under LobbyProvider and only fetch on their own outside of it.
 */
export interface LobbyState {
  data: LobbyData | null;
  loading: boolean;
}

const LobbyContext = createContext<LobbyState | null>(null);

let cache: LobbyData | Promise<LobbyData | null> | null = null;

function fetchLobby(): Promise<LobbyData | null> {
  if (cache !== null) {
    return cache instanceof Promise ? cache : Promise.resolve(cache);
  }
  const promise = apiService.get<LobbyData>('/lobby')
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

export function LobbyProvider({ children }: { children: ReactNode }) {
  const initial = cache !== null && !(cache instanceof Promise) ? cache : null;
  const [data, setData] = useState<LobbyData | null>(initial);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    let active = true;
    fetchLobby().then(d => {
      if (active) {
        setData(d);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return <LobbyContext.Provider value={{ data, loading }}>{children}</LobbyContext.Provider>;
}

/** Null outside of LobbyProvider — callers fall back to their own fetch. */
export function useLobby(): LobbyState | null {
  return useContext(LobbyContext);
}
