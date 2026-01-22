import { GameModel } from '../models';
import { Game, CreateGameDto, UpdateGameDto } from 'helper';
import { Transaction } from 'sequelize';

export class GamesRepository {
  async create(gameData: CreateGameDto, transaction?: Transaction): Promise<Game> {
    const game = await GameModel.create(
      {
        ...gameData,
        houseEdge: gameData.houseEdge || 2.5,
      },
      { transaction }
    );
    return this.mapToGame(game);
  }

  async findAll(activeOnly: boolean = false): Promise<Game[]> {
    const where = activeOnly ? { isActive: true } : {};
    const games = await GameModel.findAll({
      where,
      order: [['name', 'ASC']]
    });
    return games.map(g => this.mapToGame(g));
  }

  async findById(gameId: string): Promise<Game | null> {
    const game = await GameModel.findByPk(gameId);
    if (!game) return null;
    return this.mapToGame(game);
  }

  async findByName(name: string): Promise<Game | null> {
    const game = await GameModel.findOne({
      where: { name }
    });
    if (!game) return null;
    return this.mapToGame(game);
  }

  async update(
    gameId: string,
    updateData: UpdateGameDto,
    transaction?: Transaction
  ): Promise<Game> {
    await GameModel.update(updateData, {
      where: { id: gameId },
      transaction
    });

    const updated = await GameModel.findByPk(gameId, { transaction });
    if (!updated) {
      throw new Error('Game not found after update');
    }

    return this.mapToGame(updated);
  }

  async delete(gameId: string, transaction?: Transaction): Promise<void> {
    await GameModel.destroy({
      where: { id: gameId },
      transaction
    });
  }

  private mapToGame(data: GameModel | Record<string, unknown>): Game {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof GameModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      name: plain.name as string,
      description: plain.description as string,
      isActive: Boolean(plain.isActive || plain.is_active),
      minBet: parseFloat(String(plain.minBet || plain.min_bet)),
      maxBet: parseFloat(String(plain.maxBet || plain.max_bet)),
      houseEdge: parseFloat(String(plain.houseEdge || plain.house_edge)),
      providerId: (plain.providerId || plain.provider_id || null) as string | null,
      createdAt: new Date(plain.createdAt || plain.created_at),
      updatedAt: new Date(plain.updatedAt || plain.updated_at)
    };
  }
}

export const gamesRepository = new GamesRepository();
