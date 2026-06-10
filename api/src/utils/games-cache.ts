import type { Game, Provider, FeaturedGameWithGame, CasinoSettings } from 'helper';

export interface CachedPage {
  games: Game[];
  total: number;
}

export const CACHE_PAGE = 1;
export const CACHE_LIMIT = 30;

// Key: `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${providerName ?? ''}:${limit}`
const store = new Map<string, CachedPage | Promise<CachedPage>>();
let _providers: Provider[] | Promise<Provider[]> | null = null;
let _gameTypes: string[] | Promise<string[]> | null = null;

function pageKey(activeOnly: boolean, gameType: string | undefined, providerName: string | undefined, limit: number): string {
  return `${activeOnly ? '1' : '0'}:${gameType ?? ''}:${providerName ?? ''}:${limit}`;
}

type PageRefreshFn = (
  activeOnly: boolean,
  gameType: string | undefined,
  providerName: string | undefined,
  limit: number
) => Promise<CachedPage>;

export const gamesCache = {
  /**
   * Returns cached result or coalesces concurrent fetches into one DB query.
   * Concurrent requests for the same key share the in-flight Promise.
   */
  getOrFetch(
    activeOnly: boolean,
    gameType: string | undefined,
    providerName: string | undefined,
    limit: number,
    fetch: () => Promise<CachedPage>
  ): Promise<CachedPage> {
    const key = pageKey(activeOnly, gameType, providerName, limit);
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
      const providerName = parts[2] || undefined;
      const limit = parseInt(parts[3], 10);
      const promise = refresh(activeOnly, gameType, providerName, limit)
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

// Featured games (active, with joined Game) — single-value cache for the home
// "destacados" section. Invalidated on any admin featured-games mutation.
let _featured: FeaturedGameWithGame[] | Promise<FeaturedGameWithGame[]> | null = null;

export const featuredGamesMemCache = {
  getOrFetch(fetch: () => Promise<FeaturedGameWithGame[]>): Promise<FeaturedGameWithGame[]> {
    if (_featured !== null) {
      return _featured instanceof Promise ? _featured : Promise.resolve(_featured);
    }
    const promise = fetch()
      .then(data => { _featured = data; return data; })
      .catch(e => { _featured = null; throw e; });
    _featured = promise;
    return promise;
  },
  invalidate(): void { _featured = null; },
};

// Casino settings — keyed by requesterId (`'anon'` for the public home call).
// Caches the full owner-chain resolution + DB read. Cleared on settings update.
const settingsStore = new Map<string, CasinoSettings | Promise<CasinoSettings>>();

export const casinoSettingsMemCache = {
  getOrFetch(key: string, fetch: () => Promise<CasinoSettings>): Promise<CasinoSettings> {
    const existing = settingsStore.get(key);
    if (existing !== undefined) {
      return existing instanceof Promise ? existing : Promise.resolve(existing);
    }
    const promise = fetch()
      .then(data => { settingsStore.set(key, data); return data; })
      .catch(e => { settingsStore.delete(key); throw e; });
    settingsStore.set(key, promise);
    return promise;
  },
  invalidate(): void { settingsStore.clear(); },
};
