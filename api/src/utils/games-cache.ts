import type { Game } from 'helper';

export const CACHE_PAGE = 1;
export const CACHE_LIMIT = 50;

interface CachedPage {
  games: Game[];
  total: number;
}

let cache: CachedPage | null = null;

export const gamesCache = {
  get(): CachedPage | null {
    return cache;
  },

  set(data: CachedPage): void {
    cache = data;
  },

  invalidateAndRefresh(refresh: () => Promise<CachedPage>): void {
    cache = null;
    refresh()
      .then(data => { cache = data; })
      .catch(err => console.error('[GamesCache] Async refresh failed:', err));
  }
};
