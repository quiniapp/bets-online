import { gamesCache } from '../../src/utils/games-cache';
import type { CachedPage } from '../../src/utils/games-cache';

const page = (tag: string): CachedPage => ({ games: [{ name: tag } as never], total: 1 });

// The cache store is module-level state; each test uses its own gameType so
// keys never collide across tests.
describe('gamesCache', () => {
  it('coalesces concurrent fetches for the same key (incl. provider dimension)', async () => {
    const fetch = jest.fn().mockResolvedValue(page('a'));
    const [r1, r2] = await Promise.all([
      gamesCache.getOrFetch(true, 'typeA', 'pragmatic', 30, fetch),
      gamesCache.getOrFetch(true, 'typeA', 'pragmatic', 30, fetch),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });

  it('treats different providers as different keys', async () => {
    const fetchA = jest.fn().mockResolvedValue(page('a'));
    const fetchB = jest.fn().mockResolvedValue(page('b'));
    await gamesCache.getOrFetch(true, 'typeB', 'pragmatic', 30, fetchA);
    await gamesCache.getOrFetch(true, 'typeB', 'habanero', 30, fetchB);
    expect(fetchA).toHaveBeenCalledTimes(1);
    expect(fetchB).toHaveBeenCalledTimes(1);
  });

  it('invalidateAndRefresh re-warms previously cached keys with parsed provider', async () => {
    await gamesCache.getOrFetch(true, 'typeC', 'pragmatic', 30, () => Promise.resolve(page('old')));
    const refresh = jest.fn().mockResolvedValue(page('new'));
    gamesCache.invalidateAndRefresh(refresh);
    expect(refresh).toHaveBeenCalledWith(true, 'typeC', 'pragmatic', 30);
    const result = await gamesCache.getOrFetch(true, 'typeC', 'pragmatic', 30, () =>
      Promise.resolve(page('should-not-run'))
    );
    expect((result.games[0] as { name: string }).name).toBe('new');
  });
});
