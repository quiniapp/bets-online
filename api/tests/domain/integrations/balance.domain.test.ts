import { BalanceDomain } from '../../../src/domain/integrations/21viral/balance.domain';
import { ViralErrorCode } from 'helper';

// Mock repositories
jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: {
    findByProviderPlayerId: jest.fn()
  }
}));

jest.mock('../../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserId: jest.fn()
  }
}));

jest.mock('../../../src/persistence/repositories/users.repository', () => ({
  usersRepository: {
    findById: jest.fn()
  }
}));

import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';

const domain = new BalanceDomain();

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  providerName: '21viral',
  providerPlayerId: '123',
  currency: 'ARS',
  countryCode: 'AR',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockBalance = { id: 'bal-1', userId: 'user-1', chipBalance: 100.50, lastUpdatedAt: new Date() };

describe('BalanceDomain.getBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return formatted balance when all checks pass', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
    (balancesRepository.findByUserId as jest.Mock).mockResolvedValue(mockBalance);

    const result = await domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' });

    expect(result.balance).toBe('100.50');
    expect(result.currency).toBe('ARS');
  });

  it('should throw PlayerNotActive when profile not found', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '999' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });

  it('should throw PlayerBlocked when user status is BLOCKED', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue({ id: 'user-1', status: 'BLOCKED' });

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerBlocked });
  });

  it('should throw PlayerNotActive when profile is_active is false', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue({ ...mockProfile, isActive: false });
    (usersRepository.findById as jest.Mock).mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });
});
