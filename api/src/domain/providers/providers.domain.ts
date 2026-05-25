import { Provider, UpdateProviderDto } from 'helper';
import { providersRepository } from '../../persistence/repositories/providers.repository';
import { providersMemCache } from '../../utils/games-cache';

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
    return result;
  }
}

export const providersDomain = new ProvidersDomain();
