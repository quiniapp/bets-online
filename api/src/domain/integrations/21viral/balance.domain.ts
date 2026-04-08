import Decimal from 'decimal.js';
import { ProviderBalanceRequest, ProviderBalanceResponse, ViralErrorCode } from 'helper';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';

export class ViralError extends Error {
  constructor(public viralErrorCode: ViralErrorCode, message: string) {
    super(message);
    this.name = 'ViralError';
  }
}

export class BalanceDomain {
  async getBalance(req: ProviderBalanceRequest): Promise<ProviderBalanceResponse> {
    const profile = await userProviderProfileRepository.findByProviderPlayerId(
      '21viral',
      req.playerId
    );

    if (!profile) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player profile not found');
    }

    const user = await usersRepository.findById(profile.userId);

    if (!user) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'User not found');
    }

    if (user.status === 'BLOCKED') {
      throw new ViralError(ViralErrorCode.PlayerBlocked, 'Player is blocked');
    }

    if (user.status !== 'ACTIVE') {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player is not active');
    }

    if (!profile.isActive) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player provider profile is inactive');
    }

    const balance = await balancesRepository.findByUserId(profile.userId);

    if (!balance) {
      throw new ViralError(ViralErrorCode.GeneralFailure, 'Balance record not found');
    }

    return {
      balance: new Decimal(balance.chipBalance).toFixed(2),
      currency: profile.currency
    };
  }
}

export const balanceDomain = new BalanceDomain();
