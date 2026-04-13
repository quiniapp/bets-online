import type { Game } from 'helper';

export const CACHE_PAGE = 1;
export const CACHE_LIMIT = 50;

interface CachedPage {
  games: Game[];
  total: number;
}

type CacheKey = 'all' | 'active';

const store: Record<CacheKey, CachedPage | null> = { all: null, active: null };

export const gamesCache = {
  get(activeOnly: boolean): CachedPage | null {
    return store[activeOnly ? 'active' : 'all'];
  },

  set(data: CachedPage, activeOnly: boolean): void {
    store[activeOnly ? 'active' : 'all'] = data;
  },

  invalidateAndRefresh(refresh: (activeOnly: boolean) => Promise<CachedPage>): void {
    store.all = null;
    store.active = null;
    refresh(false)
      .then(d => { store.all = d; })
      .catch(err => console.error('[GamesCache] refresh all failed:', err));
    refresh(true)
      .then(d => { store.active = d; })
      .catch(err => console.error('[GamesCache] refresh active failed:', err));
  }
};
