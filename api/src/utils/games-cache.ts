import type { Game, Provider } from 'helper';

export interface CachedPage {
  games: Game[];
  total: number;
}

export const CACHE_PAGE = 1;
export const CACHE_LIMIT = 50;

// Key: `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${limit}`
const store = new Map<string, CachedPage>();
let _providers: Provider[] | null = null;
let _gameTypes: string[] | null = null;

function pageKey(activeOnly: boolean, gameType: string | undefined, limit: number): string {
  return `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${limit}`;
}

type PageRefreshFn = (activeOnly: boolean, gameType: string | undefined, limit: number) => Promise<CachedPage>;

export const gamesCache = {
  getPage(activeOnly: boolean, gameType: string | undefined, limit: number): CachedPage | null {
    return store.get(pageKey(activeOnly, gameType, limit)) ?? null;
  },

  setPage(data: CachedPage, activeOnly: boolean, gameType: string | undefined, limit: number): void {
    store.set(pageKey(activeOnly, gameType, limit), data);
  },

  invalidateAndRefresh(refresh: PageRefreshFn): void {
    const prevKeys = [...store.keys()];
    store.clear();
    _providers = null;
    _gameTypes = null;
    for (const key of prevKeys) {
      const parts = key.split(':');
      const activeOnly = parts[0] === '1';
      const gameType = parts[1] || undefined;
      const limit = parseInt(parts[2], 10);
      refresh(activeOnly, gameType, limit)
        .then(d => store.set(key, d))
        .catch(e => console.error(`[GamesCache] refresh ${key} failed:`, e));
    }
  },
};

export const providersMemCache = {
  get(): Provider[] | null { return _providers; },
  set(data: Provider[]): void { _providers = data; },
  invalidate(): void { _providers = null; },
};

export const gameTypesMemCache = {
  get(): string[] | null { return _gameTypes; },
  set(data: string[]): void { _gameTypes = data; },
  invalidate(): void { _gameTypes = null; },
};
