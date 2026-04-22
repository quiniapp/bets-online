import { Game, ErrorCode } from 'helper';
import { userFavoriteGamesRepository } from '../../persistence/repositories/userFavoriteGames.repository';
import { gamesRepository } from '../../persistence/repositories/games.repository';
import { AppError } from '../../middleware/error.middleware';

const MAX_FAVORITES = 20;

export class UserFavoriteGamesDomain {
  async getMyFavoriteIds(userId: string): Promise<string[]> {
    return userFavoriteGamesRepository.findIdsByUserId(userId);
  }

  async getMyFavorites(userId: string): Promise<Game[]> {
    return userFavoriteGamesRepository.findGamesByUserId(userId);
  }

  async addFavorite(userId: string, gameId: string): Promise<void> {
    const game = await gamesRepository.findById(gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    const already = await userFavoriteGamesRepository.exists(userId, gameId);
    if (already) return;

    const count = await userFavoriteGamesRepository.countByUserId(userId);
    if (count >= MAX_FAVORITES) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        `Maximum ${MAX_FAVORITES} favorites allowed`
      );
    }

    await userFavoriteGamesRepository.add(userId, gameId);
  }

  async removeFavorite(userId: string, gameId: string): Promise<void> {
    await userFavoriteGamesRepository.remove(userId, gameId);
  }
}

export const userFavoriteGamesDomain = new UserFavoriteGamesDomain();
