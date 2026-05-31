import { FeaturedGameModel } from '../models/featured-game.model';
import { GameModel } from '../models/game.model';
import { FeaturedGame, FeaturedGameWithGame, CreateFeaturedGameDto, UpdateFeaturedGameDto, Game } from 'helper';

export class FeaturedGamesRepository {
  async findAllActive(): Promise<FeaturedGameWithGame[]> {
    const rows = await FeaturedGameModel.findAll({
      where: { isActive: true },
      include: [{ model: GameModel, as: 'game' }],
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.mapWithGame(r));
  }

  async findAll(): Promise<FeaturedGame[]> {
    const rows = await FeaturedGameModel.findAll({
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.map(r));
  }

  async findAllWithGame(): Promise<FeaturedGameWithGame[]> {
    const rows = await FeaturedGameModel.findAll({
      include: [{ model: GameModel, as: 'game' }],
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.mapWithGame(r));
  }

  async create(data: CreateFeaturedGameDto): Promise<FeaturedGame> {
    const row = await FeaturedGameModel.create(data as any);
    return this.map(row);
  }

  async update(id: string, data: UpdateFeaturedGameDto): Promise<FeaturedGame | null> {
    const row = await FeaturedGameModel.findByPk(id);
    if (!row) return null;
    await row.update(data);
    return this.map(row);
  }

  async delete(id: string): Promise<boolean> {
    const row = await FeaturedGameModel.findByPk(id);
    if (!row) return false;
    await row.destroy();
    return true;
  }

  private map(model: FeaturedGameModel): FeaturedGame {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      gameId: plain.gameId,
      sortOrder: plain.sortOrder,
      isActive: plain.isActive,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }

  private mapWithGame(model: any): FeaturedGameWithGame {
    const plain = model.get({ plain: true });
    const game: Game = {
      id: plain.game.id,
      name: plain.game.name,
      description: plain.game.description,
      isActive: plain.game.isActive,
      minBet: Number(plain.game.minBet),
      maxBet: Number(plain.game.maxBet),
      houseEdge: Number(plain.game.houseEdge),
      providerId: plain.game.providerId ?? null,
      providerGameId: plain.game.providerGameId ?? null,
      providerName: plain.game.providerName ?? null,
      defaultLogo: plain.game.defaultLogo ?? null,
      gameType: plain.game.gameType ?? null,
      sortOrder: plain.game.sortOrder ?? null,
      createdAt: new Date(plain.game.createdAt),
      updatedAt: new Date(plain.game.updatedAt)
    };
    return {
      id: plain.id,
      gameId: plain.gameId,
      sortOrder: plain.sortOrder,
      isActive: plain.isActive,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt),
      game
    };
  }
}

export const featuredGamesRepository = new FeaturedGamesRepository();
