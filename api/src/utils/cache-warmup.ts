import { gamesDomain } from '../domain/games/games.domain';
import { providersDomain } from '../domain/providers/providers.domain';
import { featuredGamesDomain } from '../domain/featured-games/featured-games.domain';
import { settingsDomain } from '../domain/settings/settings.domain';
import { CACHE_PAGE, CACHE_LIMIT } from './games-cache';
import { logger } from './logger';

const HOMEPAGE_LIMIT = 24;

export async function warmupCache(): Promise<void> {
  const start = Date.now();

  // Warm every home page-1 section: providers, game types, featured games,
  // casino settings, and the base game lists — all in parallel.
  const [types] = await Promise.all([
    gamesDomain.getDistinctGameTypes(),
    providersDomain.getAll(),
    featuredGamesDomain.getActive(),
    settingsDomain.getCasinoSettings(),
    gamesDomain.getPaginatedGames(CACHE_PAGE, HOMEPAGE_LIMIT, true),
    gamesDomain.getPaginatedGames(CACHE_PAGE, CACHE_LIMIT, true),
    gamesDomain.getPaginatedGames(CACHE_PAGE, CACHE_LIMIT, false),
  ]);

  // Warm each game type (active, homepage limit) in parallel
  await Promise.all(
    types.map(gameType => gamesDomain.getPaginatedGames(CACHE_PAGE, HOMEPAGE_LIMIT, true, undefined, undefined, gameType))
  );

  logger.info({ ms: Date.now() - start, gameTypes: types.length }, '[CacheWarmup] done');
}
