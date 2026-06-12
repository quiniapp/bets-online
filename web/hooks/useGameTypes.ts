"use client"
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import { useLobby } from '@/contexts/lobby-context';

// Module-level cache: every component mounting this hook in the same page load
// shares one /games/types request (page.tsx, CategoriesBar, etc.).
let cache: string[] | Promise<string[]> | null = null;

function fetchTypes(): Promise<string[]> {
  if (cache !== null) {
    return cache instanceof Promise ? cache : Promise.resolve(cache);
  }
  const promise = apiService
    .get<{ types: string[] }>('/games/types')
    .then(res => {
      const types = res.success && res.data ? res.data.types : [];
      cache = types;
      return types;
    })
    .catch(() => {
      cache = null;
      return [];
    });
  cache = promise;
  return promise;
}

export function useGameTypes() {
  // Under LobbyProvider the aggregated /lobby payload already includes the
  // types — no own request unless the lobby fetch failed.
  const lobby = useLobby();
  const lobbyActive = !!lobby && (lobby.loading || lobby.data !== null);

  const [ownTypes, setOwnTypes] = useState<string[]>(Array.isArray(cache) ? cache : []);
  const [ownLoading, setOwnLoading] = useState(!Array.isArray(cache));

  useEffect(() => {
    if (lobbyActive) return;
    let active = true;
    fetchTypes().then(t => {
      if (active) {
        setOwnTypes(t);
        setOwnLoading(false);
      }
    });
    return () => { active = false; };
  }, [lobbyActive]);

  if (lobbyActive) {
    return { types: lobby!.data?.types ?? [], loading: lobby!.loading };
  }
  return { types: ownTypes, loading: ownLoading };
}
