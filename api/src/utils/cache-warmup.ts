import { gamesDomain } from '../domain/games/games.domain';
import { providersDomain } from '../domain/providers/providers.domain';
import { CACHE_PAGE, CACHE_LIMIT } from './games-cache';

const HOMEPAGE_LIMIT = 24;

export async function warmupCache(): Promise<void> {
  const start = Date.now();

  // Warm providers and game types in parallel with the base game lists
  const [types] = await Promise.all([
    gamesDomain.getDistinctGameTypes(),
    providersDomain.getAll(),
    gamesDomain.getPaginatedGames(CACHE_PAGE, HOMEPAGE_LIMIT, true),
    gamesDomain.getPaginatedGames(CACHE_PAGE, CACHE_LIMIT, true),
    gamesDomain.getPaginatedGames(CACHE_PAGE, CACHE_LIMIT, false),
  ]);

  // Warm each game type (active, homepage limit) in parallel
  await Promise.all(
    types.map(gameType => gamesDomain.getPaginatedGames(CACHE_PAGE, HOMEPAGE_LIMIT, true, undefined, undefined, gameType))
  );

  console.log(`[CacheWarmup] done in ${Date.now() - start}ms — ${types.length} game types warmed`);
}
