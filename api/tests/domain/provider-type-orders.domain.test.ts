import { providerTypeOrdersDomain } from '../../src/features/provider-type-orders/provider-type-orders.domain';
import { providerTypeOrdersRepository } from '../../src/features/provider-type-orders/provider-type-orders.repository';
import { ProviderModel } from '../../src/features/providers/provider.model';
import { gamesDomain } from '../../src/features/games/games.domain';
import { AppError } from '../../src/middleware/error.middleware';

jest.mock('../../src/features/providers/provider.model', () => ({
  ProviderModel: { findOne: jest.fn() },
}));
jest.mock('../../src/features/provider-type-orders/provider-type-orders.repository', () => ({
  providerTypeOrdersRepository: {
    findEffectiveByProvider: jest.fn().mockResolvedValue([]),
    replaceAll: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../src/features/games/games.domain', () => ({
  gamesDomain: { refreshGamesCache: jest.fn() },
}));

describe('ProviderTypeOrdersDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ProviderModel.findOne as jest.Mock).mockResolvedValue({ name: 'pragmatic' });
  });

  it('replace persists rules and re-warms the games cache', async () => {
    await providerTypeOrdersDomain.replace('pragmatic', [{ gameType: 'videoSlots', sortOrder: 0 }]);
    expect(providerTypeOrdersRepository.replaceAll).toHaveBeenCalledWith('pragmatic', [
      { gameType: 'videoSlots', sortOrder: 0 },
    ]);
    expect(gamesDomain.refreshGamesCache).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when provider does not exist', async () => {
    (ProviderModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(providerTypeOrdersDomain.replace('nope', [])).rejects.toThrow(AppError);
    expect(providerTypeOrdersRepository.replaceAll).not.toHaveBeenCalled();
    expect(gamesDomain.refreshGamesCache).not.toHaveBeenCalled();
  });

  it('getEffective returns repository items', async () => {
    (providerTypeOrdersRepository.findEffectiveByProvider as jest.Mock).mockResolvedValue([
      { gameType: 'videoSlots', sortOrder: 0, displayName: 'Slots' },
    ]);
    const items = await providerTypeOrdersDomain.getEffective('pragmatic');
    expect(items).toHaveLength(1);
    expect(items[0].gameType).toBe('videoSlots');
  });
});
