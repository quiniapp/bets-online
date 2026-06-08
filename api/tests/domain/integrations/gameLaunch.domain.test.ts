import { gameLaunchDomain } from '../../../src/domain/integrations/21viral/gameLaunch.domain';
import { viralService } from '../../../src/services/viral.service';
import { gamesRepository } from '../../../src/persistence/repositories/games.repository';
import { providersRepository } from '../../../src/persistence/repositories/providers.repository';
import { gameTypesRepository } from '../../../src/persistence/repositories/game-types.repository';
import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';
import { UserRole } from 'helper';

jest.mock('../../../src/config', () => ({
  config: {
    viral: {
      username: 'testuser',
      secretKey: 'a'.repeat(32),
      integratorUrl: 'https://api.stg.games-viral.com/'
    }
  }
}));

jest.mock('../../../src/services/viral.service', () => ({
  viralService: {
    getGames: jest.fn(),
    createGameSession: jest.fn()
  }
}));
jest.mock('../../../src/persistence/repositories/games.repository', () => ({
  gamesRepository: {
    findById: jest.fn(),
    upsertFromProvider: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ games: [], total: 0 })
  }
}));
jest.mock('../../../src/persistence/repositories/providers.repository', () => ({
  providersRepository: {
    upsertByName: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock('../../../src/persistence/repositories/game-types.repository', () => ({
  gameTypesRepository: {
    upsertByName: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: {
    findByUserId: jest.fn(),
    create: jest.fn(),
    updateCurrentGame: jest.fn()
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
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([{ next_id: '100001' }])
  }
}));

const mockViralService = viralService as jest.Mocked<typeof viralService>;
const mockGamesRepo = gamesRepository as jest.Mocked<typeof gamesRepository>;
const mockProvidersRepo = providersRepository as jest.Mocked<typeof providersRepository>;
const mockGameTypesRepo = gameTypesRepository as jest.Mocked<typeof gameTypesRepository>;
const mockProfileRepo = userProviderProfileRepository as jest.Mocked<typeof userProviderProfileRepository>;
const mockBalancesRepo = balancesRepository as jest.Mocked<typeof balancesRepository>;
const mockUsersRepo = usersRepository as jest.Mocked<typeof usersRepository>;

describe('gameLaunchDomain', () => {
  beforeEach(() => jest.clearAllMocks());

  const userId = 'user-uuid-123';
  const gameId = 'game-uuid-456';

  const mockGame = {
    id: gameId,
    name: 'Wolf Gold',
    description: 'test',
    isActive: true,
    minBet: 1,
    maxBet: 10000,
    houseEdge: 0,
    providerGameId: 'vs25wolfgold',
    providerName: 'pragmatic',
    defaultLogo: null,
    gameType: 'slot',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUser = {
    id: userId,
    username: 'testplayer',
    email: 'test@test.com',
    role: UserRole.PLAYER,
    status: 'ACTIVE' as any,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProfile = {
    id: 'profile-uuid',
    userId,
    providerName: '21viral',
    providerPlayerId: '100001',
    currency: 'ARS',
    countryCode: 'AR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBalance = {
    id: 'balance-uuid',
    userId,
    chipBalance: 500.00,
    lastUpdatedAt: new Date()
  };

  const launchParams = {
    userId,
    gameId,
    playerDeviceType: 'Desktop' as const,
    gameMode: 'Real' as const,
    lobbyUrl: 'https://op.com/lobby',
    depositUrl: 'https://op.com/deposit'
  };

  describe('syncGames', () => {
    it('fetches games from viral and upserts each one', async () => {
      mockViralService.getGames.mockResolvedValue([
        { id: 1, name: 'Wolf Gold', type: 'slot', defaultLogo: 'https://img/wolf.png', providerName: 'pragmatic', providerGameId: 'vs25wolfgold' }
      ]);
      mockGamesRepo.upsertFromProvider.mockResolvedValue(mockGame);

      const result = await gameLaunchDomain.syncGames();

      expect(mockViralService.getGames).toHaveBeenCalledTimes(1);
      expect(mockProvidersRepo.upsertByName).toHaveBeenCalledWith('pragmatic');
      expect(mockGameTypesRepo.upsertByName).toHaveBeenCalledWith('slot');
      expect(mockGamesRepo.upsertFromProvider).toHaveBeenCalledWith({
        providerName: 'pragmatic',
        providerGameId: 'vs25wolfgold',
        name: 'Wolf Gold',
        gameType: 'slot',
        defaultLogo: 'https://img/wolf.png'
      });
      expect(result).toEqual({ synced: 1 });
    });
  });

  describe('launchGame', () => {
    it('returns gameStartUrl for player with existing profile', async () => {
      mockGamesRepo.findById.mockResolvedValue(mockGame);
      mockUsersRepo.findById.mockResolvedValue(mockUser as any);
      mockProfileRepo.findByUserId.mockResolvedValue(mockProfile);
      mockBalancesRepo.findByUserId.mockResolvedValue(mockBalance as any);
      mockViralService.createGameSession.mockResolvedValue('https://provider.com/session/abc');

      const result = await gameLaunchDomain.launchGame(launchParams);

      expect(result).toBe('https://provider.com/session/abc');
      expect(mockViralService.createGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: '100001',
          playerUserName: 'testplayer',
          providerName: 'pragmatic',
          providerGameId: 'vs25wolfgold',
          balance: '500.00',
          currency: 'ARS'
        })
      );
      // Launch must persist the current game so provider callbacks (which omit
      // providerGameId) can attribute each round to the right game.
      expect(mockProfileRepo.updateCurrentGame).toHaveBeenCalledWith('21viral', '100001', 'vs25wolfgold');
    });

    it('auto-creates UserProviderProfile when none exists', async () => {
      mockGamesRepo.findById.mockResolvedValue(mockGame);
      mockUsersRepo.findById.mockResolvedValue(mockUser as any);
      mockProfileRepo.findByUserId.mockResolvedValue(null);
      mockProfileRepo.create.mockResolvedValue(mockProfile);
      mockBalancesRepo.findByUserId.mockResolvedValue(mockBalance as any);
      mockViralService.createGameSession.mockResolvedValue('https://provider.com/session/new');

      await gameLaunchDomain.launchGame(launchParams);

      expect(mockProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          providerName: '21viral',
          providerPlayerId: '100001'
        })
      );
    });

    it('throws 404 when game not found', async () => {
      mockGamesRepo.findById.mockResolvedValue(null);

      await expect(gameLaunchDomain.launchGame(launchParams)).rejects.toThrow('Game not found');
    });

    it('throws when game has no providerGameId', async () => {
      mockGamesRepo.findById.mockResolvedValue({ ...mockGame, providerGameId: null, providerName: null });
      mockUsersRepo.findById.mockResolvedValue(mockUser as any);

      await expect(gameLaunchDomain.launchGame(launchParams)).rejects.toThrow('Game is not linked to a provider');
    });
  });
});
