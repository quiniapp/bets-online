import { Provider } from 'helper';
import { providersRepository } from '../../persistence/repositories/providers.repository';

export class ProvidersDomain {
  async getAll(): Promise<Provider[]> {
    return providersRepository.findAll();
  }
}

export const providersDomain = new ProvidersDomain();
