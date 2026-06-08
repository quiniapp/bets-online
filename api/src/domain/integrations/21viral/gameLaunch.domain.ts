import Decimal from 'decimal.js';
import { QueryTypes } from 'sequelize';
import { viralService } from '../../../services/viral.service';
import { gamesRepository } from '../../../persistence/repositories/games.repository';
import { providersRepository } from '../../../persistence/repositories/providers.repository';
import { gameTypesRepository } from '../../../persistence/repositories/game-types.repository';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';
import { sequelize } from '../../../config/sequelize';
import { AppError } from '../../../middleware/error.middleware';
import { ErrorCode } from 'helper';
import { gamesCache, CACHE_PAGE } from '../../../utils/games-cache';

export interface LaunchGameParams {
  userId: string;
  gameId: string;
  playerDeviceType: 'Desktop' | 'Mobile';
  gameMode: 'Real' | 'Demo';
  lobbyUrl: string;
  depositUrl: string;
  exitUrl?: string;
}

class GameLaunchDomain {
  async syncGames(): Promise<{ synced: number }> {
    const games = await viralService.getGames();

    const uniqueProviders = [...new Set(games.map(g => g.providerName))];
    const uniqueGameTypes = [...new Set(games.map(g => g.type))];

    await Promise.all(uniqueProviders.map(name => providersRepository.upsertByName(name)));
    await Promise.all(uniqueGameTypes.map(name => gameTypesRepository.upsertByName(name)));

    for (const g of games) {
      await gamesRepository.upsertFromProvider({
        providerName: g.providerName,
        providerGameId: g.providerGameId,
        name: g.name,
        gameType: g.type,
        defaultLogo: g.defaultLogo
      });
    }
    gamesCache.invalidateAndRefresh((activeOnly, gameType, limit) =>
      gamesRepository.findPaginated(CACHE_PAGE, limit, activeOnly, undefined, undefined, gameType));
    return { synced: games.length };
  }

  async launchGame(params: LaunchGameParams): Promise<string> {
    const game = await gamesRepository.findById(params.gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    if (!game.providerGameId || !game.providerName) {
      throw new AppError(422, ErrorCode.VALIDATION_ERROR, 'Game is not linked to a provider');
    }

    const user = await usersRepository.findById(params.userId);
    if (!user) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    let profile = await userProviderProfileRepository.findByUserId(params.userId, '21viral');
    if (!profile) {
      const rows = await sequelize.query<{ next_id: string }>(
        "SELECT NEXTVAL('viral_player_id_seq') AS next_id",
        { type: QueryTypes.SELECT }
      );
      const row = rows[0];
      profile = await userProviderProfileRepository.create({
        userId: params.userId,
        providerName: '21viral',
        providerPlayerId: String(row.next_id),
        currency: 'ARS',
        countryCode: 'AR'
      });
    }

    // Persist the launched game on the player's provider profile. 21viral debit/credit
    // callbacks omit providerGameId, so transactions fall back to this value to attribute
    // each round to the correct game (powers top-played / top-providers reporting).
    await userProviderProfileRepository.updateCurrentGame(
      '21viral',
      profile.providerPlayerId,
      game.providerGameId
    );

    const balance = await balancesRepository.findByUserId(params.userId);
    const formattedBalance = new Decimal(balance?.chipBalance ?? 0).toFixed(2);

    return viralService.createGameSession({
      playerId: profile.providerPlayerId,
      playerUserName: user.username,
      playerDeviceType: params.playerDeviceType,
      providerName: game.providerName,
      providerGameId: game.providerGameId,
      gameMode: params.gameMode,
      localeCode: 'es-AR',
      countryCode: profile.countryCode,
      currency: profile.currency,
      balance: formattedBalance,
      lobbyUrl: params.lobbyUrl,
      depositUrl: params.depositUrl,
      exitUrl: params.exitUrl
    });
  }
}

export const gameLaunchDomain = new GameLaunchDomain();
