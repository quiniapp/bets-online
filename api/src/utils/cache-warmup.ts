import { GAMES_PAGE_LIMIT } from 'helper';
import { gamesDomain } from '../features/games/games.domain';
import { providersDomain } from '../features/providers/providers.domain';
import { featuredGamesDomain } from '../features/featured-games/featured-games.domain';
import { settingsDomain } from '../features/settings/settings.domain';
import { CACHE_PAGE } from './games-cache';
import { logger } from './logger';

/**
 * Warm the page-1 games cache for every section the home renders from
 * casino_settings.lobbySlots (category, provider or both). Also used after a
 * lobbySlots update so the first visitor never hits the DB.
 */
export async function warmLobbySections(): Promise<void> {
  const settings = await settingsDomain.getCasinoSettings();
  const combos = new Map<string, { gameType?: string; providerName?: string }>();
  for (const slot of settings.lobbySlots) {
    const gameType = slot.kind === 'provider' ? undefined : (slot.categoryType || undefined);
    const providerName = slot.kind === 'category' ? undefined : (slot.providerName || undefined);
    if (!gameType && !providerName) continue;
    combos.set(`${gameType ?? ''}:${providerName ?? ''}`, { gameType, providerName });
  }
  await Promise.all(
    [...combos.values()].map(({ gameType, providerName }) =>
      gamesDomain.getPaginatedGames(CACHE_PAGE, GAMES_PAGE_LIMIT, true, providerName, undefined, gameType)
    )
  );
}

export async function warmupCache(): Promise<void> {
  const start = Date.now();

  // Warm every home page-1 section: providers, game types, featured games,
  // casino settings, and the base game lists — all in parallel.
  const [types] = await Promise.all([
    gamesDomain.getDistinctGameTypes(),
    providersDomain.getAll(),
    featuredGamesDomain.getActive(),
    settingsDomain.getCasinoSettings(),
    gamesDomain.getPaginatedGames(CACHE_PAGE, GAMES_PAGE_LIMIT, true),
    gamesDomain.getPaginatedGames(CACHE_PAGE, GAMES_PAGE_LIMIT, false),
  ]);

  // Warm each game type and each lobby-slot section (category/provider/both)
  await Promise.all([
    ...types.map(gameType =>
      gamesDomain.getPaginatedGames(CACHE_PAGE, GAMES_PAGE_LIMIT, true, undefined, undefined, gameType)
    ),
    warmLobbySections(),
  ]);

  logger.info({ ms: Date.now() - start, gameTypes: types.length }, '[CacheWarmup] done');
}
