import { ErrorCode, ProviderTypeOrderItem } from 'helper';
import { AppError } from '../../middleware/error.middleware';
import { ProviderModel } from '../providers/provider.model';
import { providerTypeOrdersRepository } from './provider-type-orders.repository';
import { gamesDomain } from '../games/games.domain';

export class ProviderTypeOrdersDomain {
  private async requireProvider(providerName: string): Promise<void> {
    const provider = await ProviderModel.findOne({ where: { name: providerName } });
    if (!provider) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Provider not found');
    }
  }

  async getEffective(providerName: string): Promise<ProviderTypeOrderItem[]> {
    await this.requireProvider(providerName);
    return providerTypeOrdersRepository.findEffectiveByProvider(providerName);
  }

  async replace(providerName: string, items: { gameType: string; sortOrder: number }[]): Promise<ProviderTypeOrderItem[]> {
    await this.requireProvider(providerName);
    await providerTypeOrdersRepository.replaceAll(providerName, items);
    // Type grouping is an ORDER BY input of the games list → re-warm page-1 cache.
    gamesDomain.refreshGamesCache();
    return providerTypeOrdersRepository.findEffectiveByProvider(providerName);
  }
}

export const providerTypeOrdersDomain = new ProviderTypeOrdersDomain();
