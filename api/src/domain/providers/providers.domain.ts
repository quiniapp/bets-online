import { Provider, UpdateProviderDto } from 'helper';
import { providersRepository } from '../../persistence/repositories/providers.repository';
import { providersMemCache } from '../../utils/games-cache';
import { gamesDomain } from '../games/games.domain';

export class ProvidersDomain {
  async getAll(): Promise<Provider[]> {
    return providersMemCache.getOrFetch(() => providersRepository.findAll());
  }

  async getAllForAdmin(): Promise<Provider[]> {
    return providersRepository.findAllForAdmin();
  }

  async update(name: string, data: UpdateProviderDto): Promise<Provider | null> {
    const result = await providersRepository.update(name, data);
    providersMemCache.invalidate();
    // The game list is sorted by provider sort_order, so a provider change
    // (esp. re-ordering) must also re-warm the page-1 games cache.
    gamesDomain.refreshGamesCache();
    return result;
  }
}

export const providersDomain = new ProvidersDomain();
