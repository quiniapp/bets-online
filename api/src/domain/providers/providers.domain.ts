import { Provider, UpdateProviderDto } from 'helper';
import { providersRepository } from '../../persistence/repositories/providers.repository';

export class ProvidersDomain {
  async getAll(): Promise<Provider[]> {
    return providersRepository.findAll();
  }

  async update(name: string, data: UpdateProviderDto): Promise<Provider | null> {
    return providersRepository.update(name, data);
  }
}

export const providersDomain = new ProvidersDomain();
