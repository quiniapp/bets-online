import type { Game, Provider } from 'helper';

export interface CachedPage {
  games: Game[];
  total: number;
}

export const CACHE_PAGE = 1;
export const CACHE_LIMIT = 50;

// Key: `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${limit}`
const store = new Map<string, CachedPage | Promise<CachedPage>>();
let _providers: Provider[] | Promise<Provider[]> | null = null;
let _gameTypes: string[] | Promise<string[]> | null = null;

function pageKey(activeOnly: boolean, gameType: string | undefined, limit: number): string {
  return `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${limit}`;
}

type PageRefreshFn = (activeOnly: boolean, gameType: string | undefined, limit: number) => Promise<CachedPage>;

export const gamesCache = {
  /**
   * Returns cached result or coalesces concurrent fetches into one DB query.
   * Concurrent requests for the same key share the in-flight Promise.
   */
  getOrFetch(
    activeOnly: boolean,
    gameType: string | undefined,
    limit: number,
    fetch: () => Promise<CachedPage>
  ): Promise<CachedPage> {
    const key = pageKey(activeOnly, gameType, limit);
    const existing = store.get(key);
    if (existing !== undefined) {
      return existing instanceof Promise ? existing : Promise.resolve(existing);
    }
    const promise = fetch()
      .then(data => { store.set(key, data); return data; })
      .catch(e => { store.delete(key); throw e; });
    store.set(key, promise);
    return promise;
  },

  invalidateAndRefresh(refresh: PageRefreshFn): void {
    const prevKeys = [...store.keys()];
    store.clear();
    _providers = null;
    _gameTypes = null;
    // Set in-flight promises immediately so requests arriving during re-warm coalesce
    for (const key of prevKeys) {
      const parts = key.split(':');
      const activeOnly = parts[0] === '1';
      const gameType = parts[1] || undefined;
      const limit = parseInt(parts[2], 10);
      const promise = refresh(activeOnly, gameType, limit)
        .then(d => { store.set(key, d); return d; })
        .catch(e => { store.delete(key); console.error(`[GamesCache] refresh ${key} failed:`, e); throw e; });
      store.set(key, promise);
    }
  },
};

export const providersMemCache = {
  getOrFetch(fetch: () => Promise<Provider[]>): Promise<Provider[]> {
    if (_providers !== null) {
      return _providers instanceof Promise ? _providers : Promise.resolve(_providers);
    }
    const promise = fetch()
      .then(data => { _providers = data; return data; })
      .catch(e => { _providers = null; throw e; });
    _providers = promise;
    return promise;
  },
  invalidate(): void { _providers = null; },
};

export const gameTypesMemCache = {
  getOrFetch(fetch: () => Promise<string[]>): Promise<string[]> {
    if (_gameTypes !== null) {
      return _gameTypes instanceof Promise ? _gameTypes : Promise.resolve(_gameTypes);
    }
    const promise = fetch()
      .then(data => { _gameTypes = data; return data; })
      .catch(e => { _gameTypes = null; throw e; });
    _gameTypes = promise;
    return promise;
  },
  invalidate(): void { _gameTypes = null; },
};
