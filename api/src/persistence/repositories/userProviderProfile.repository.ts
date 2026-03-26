import { Transaction } from 'sequelize';
import { UserProviderProfileModel } from '../models/UserProviderProfile.model';
import { UserProviderProfile } from 'helper';

export class UserProviderProfileRepository {
  async findByProviderPlayerId(
    providerName: string,
    providerPlayerId: string,
    transaction?: Transaction
  ): Promise<UserProviderProfile | null> {
    const profile = await UserProviderProfileModel.findOne({
      where: { providerName, providerPlayerId },
      transaction
    });
    if (!profile) return null;
    return this.mapToProfile(profile);
  }

  async findByUserId(
    userId: string,
    providerName: string,
    transaction?: Transaction
  ): Promise<UserProviderProfile | null> {
    const profile = await UserProviderProfileModel.findOne({
      where: { userId, providerName },
      transaction
    });
    if (!profile) return null;
    return this.mapToProfile(profile);
  }

  async create(
    data: {
      userId: string;
      providerName: string;
      providerPlayerId: string;
      currency?: string;
      countryCode?: string;
    },
    transaction?: Transaction
  ): Promise<UserProviderProfile> {
    const profile = await UserProviderProfileModel.create(
      {
        userId: data.userId,
        providerName: data.providerName,
        providerPlayerId: data.providerPlayerId,
        currency: data.currency ?? 'ARS',
        countryCode: data.countryCode ?? 'AR',
        isActive: true
      },
      { transaction }
    );
    return this.mapToProfile(profile);
  }

  private mapToProfile(model: UserProviderProfileModel): UserProviderProfile {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      providerName: plain.providerName,
      providerPlayerId: plain.providerPlayerId,
      currency: plain.currency,
      countryCode: plain.countryCode,
      isActive: plain.isActive,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const userProviderProfileRepository = new UserProviderProfileRepository();
