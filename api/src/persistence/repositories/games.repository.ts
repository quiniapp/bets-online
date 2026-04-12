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

  async findPaginated(
    page: number,
    limit: number
  ): Promise<{ games: Game[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await GameModel.findAndCountAll({
      order: [['name', 'ASC']],
      limit,
      offset
    });
    return { games: rows.map(g => this.mapToGame(g)), total: count };
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

  async findByProviderGame(
    providerName: string,
    providerGameId: string
  ): Promise<Game | null> {
    const game = await GameModel.findOne({
      where: { providerName, providerGameId }
    });
    if (!game) return null;
    return this.mapToGame(game);
  }

  async upsertFromProvider(data: {
    providerName: string;
    providerGameId: string;
    name: string;
    gameType: string;
    defaultLogo: string;
  }): Promise<Game> {
    const existing = await GameModel.findOne({
      where: { providerName: data.providerName, providerGameId: data.providerGameId }
    });

    if (existing) {
      await existing.update({
        name: data.name,
        gameType: data.gameType,
        defaultLogo: data.defaultLogo
      });
      return this.mapToGame(existing);
    }

    const created = await GameModel.create({
      name: data.name,
      description: `${data.name} — synced from ${data.providerName}`,
      isActive: true,
      minBet: 1,
      maxBet: 10000,
      houseEdge: 0,
      providerName: data.providerName,
      providerGameId: data.providerGameId,
      defaultLogo: data.defaultLogo,
      gameType: data.gameType
    });
    return this.mapToGame(created);
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

export const gamesRepository = new GamesRepository();
