import { gameTypesDomain } from '../../src/features/game-types/game-types.domain';
import { gameTypesRepository } from '../../src/features/game-types/game-types.repository';
import { gamesDomain } from '../../src/features/games/games.domain';

jest.mock('../../src/features/game-types/game-types.repository', () => ({
  gameTypesRepository: { findAll: jest.fn(), update: jest.fn() },
}));
jest.mock('../../src/features/games/games.domain', () => ({
  gamesDomain: { refreshGamesCache: jest.fn() },
}));

describe('GameTypesDomain', () => {
  beforeEach(() => jest.clearAllMocks());

  it('update re-warms the games cache (type sort is an ORDER BY input)', async () => {
    (gameTypesRepository.update as jest.Mock).mockResolvedValue({ name: 'videoSlots', sortOrder: 1 });
    await gameTypesDomain.update('videoSlots', { sortOrder: 1 });
    expect(gamesDomain.refreshGamesCache).toHaveBeenCalledTimes(1);
  });

  it('update of unknown type does not touch the cache', async () => {
    (gameTypesRepository.update as jest.Mock).mockResolvedValue(null);
    await gameTypesDomain.update('nope', { sortOrder: 1 });
    expect(gamesDomain.refreshGamesCache).not.toHaveBeenCalled();
  });
});
