import { UserFavoriteGameModel } from './UserFavoriteGame.model';
import { GameModel } from '../games/game.model';
import { Game } from 'helper';

export class UserFavoriteGamesRepository {
  async findIdsByUserId(userId: string): Promise<string[]> {
    const rows = await UserFavoriteGameModel.findAll({
      where: { userId },
      attributes: ['gameId'],
      order: [['createdAt', 'DESC']]
    });
    return rows.map(r => r.gameId);
  }

  async findGamesByUserId(userId: string): Promise<Game[]> {
    const rows = await UserFavoriteGameModel.findAll({
      where: { userId },
      include: [{ model: GameModel, as: 'game' }],
      order: [['createdAt', 'DESC']]
    });

    return rows
      .map(r => {
        const game = (r as any).game as GameModel | undefined;
        if (!game) return null;
        return this.mapToGame(game);
      })
      .filter((g): g is Game => g !== null);
  }

  async countByUserId(userId: string): Promise<number> {
    return UserFavoriteGameModel.count({ where: { userId } });
  }

  async exists(userId: string, gameId: string): Promise<boolean> {
    const row = await UserFavoriteGameModel.findOne({ where: { userId, gameId } });
    return row !== null;
  }

  async add(userId: string, gameId: string): Promise<void> {
    await UserFavoriteGameModel.create({ userId, gameId });
  }

  async remove(userId: string, gameId: string): Promise<void> {
    await UserFavoriteGameModel.destroy({ where: { userId, gameId } });
  }

  private mapToGame(model: GameModel): Game {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      name: plain.name,
      description: plain.description,
      isActive: plain.isActive,
      minBet: Number(plain.minBet),
      maxBet: Number(plain.maxBet),
      houseEdge: Number(plain.houseEdge),
      providerId: plain.providerId ?? null,
      providerGameId: plain.providerGameId ?? null,
      providerName: plain.providerName ?? null,
      defaultLogo: plain.defaultLogo ?? null,
      gameType: plain.gameType ?? null,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const userFavoriteGamesRepository = new UserFavoriteGamesRepository();
