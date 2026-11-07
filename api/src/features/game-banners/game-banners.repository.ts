import { GameBannerModel } from './game-banner.model';
import { GameModel } from '../games/game.model';
import { Game, GameBanner, GameBannerWithGame, CreateGameBannerDto, UpdateGameBannerDto } from 'helper';

export class GameBannersRepository {
  async findAllActive(placement: string = 'hero'): Promise<GameBanner[]> {
    const rows = await GameBannerModel.findAll({
      where: { isActive: true, placement },
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.map(r));
  }

  async findAll(placement?: string): Promise<GameBanner[]> {
    const rows = await GameBannerModel.findAll({
      where: placement ? { placement } : {},
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.map(r));
  }

  async findAllWithGame(placement?: string): Promise<GameBannerWithGame[]> {
    const rows = await GameBannerModel.findAll({
      where: placement ? { placement } : {},
      include: [{ model: GameModel, as: 'game' }],
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => {
      const banner = this.map(r);
      const plain: any = r.get({ plain: true });
      const g = plain.game;
      const game: Game | null = g
        ? {
            id: g.id,
            name: g.name,
            description: g.description,
            isActive: g.isActive,
            minBet: Number(g.minBet),
            maxBet: Number(g.maxBet),
            houseEdge: Number(g.houseEdge),
            providerId: g.providerId ?? null,
            providerGameId: g.providerGameId ?? null,
            providerName: g.visibleProviderName ?? g.providerName ?? null,
            defaultLogo: g.defaultLogo ?? null,
            gameType: g.gameType ?? null,
            rtp: g.rtp != null ? Number(g.rtp) : null,
            sortOrder: g.sortOrder ?? null,
            createdAt: new Date(g.createdAt),
            updatedAt: new Date(g.updatedAt)
          }
        : null;
      return { ...banner, game };
    });
  }

  async findById(id: string): Promise<GameBanner | null> {
    const row = await GameBannerModel.findByPk(id);
    return row ? this.map(row) : null;
  }

  async create(data: CreateGameBannerDto): Promise<GameBanner> {
    const sortOrder =
      data.sortOrder ?? (((await GameBannerModel.max('sortOrder')) as number | null) ?? 0) + 1;
    const row = await GameBannerModel.create({
      sortOrder,
      isActive: true,
      gameId: data.gameId ?? null,
      placement: data.placement ?? 'hero'
    } as any);
    return this.map(row);
  }

  async setImageUrl(id: string, imageUrl: string): Promise<void> {
    await GameBannerModel.update({ imageUrl }, { where: { id } });
  }

  async update(id: string, data: UpdateGameBannerDto): Promise<GameBanner | null> {
    const row = await GameBannerModel.findByPk(id);
    if (!row) return null;
    await row.update(data);
    return this.map(row);
  }

  async delete(id: string): Promise<GameBanner | null> {
    const row = await GameBannerModel.findByPk(id);
    if (!row) return null;
    const mapped = this.map(row);
    await row.destroy();
    return mapped;
  }

  private map(model: GameBannerModel): GameBanner {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      gameId: plain.gameId ?? null,
      placement: plain.placement ?? 'hero',
      sortOrder: plain.sortOrder,
      isActive: plain.isActive,
      imageUrl: plain.imageUrl ?? null,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const gameBannersRepository = new GameBannersRepository();
