import { GameBannerModel } from './game-banner.model';
import { GameBanner, CreateGameBannerDto, UpdateGameBannerDto } from 'helper';

export class GameBannersRepository {
  async findAllActive(): Promise<GameBanner[]> {
    const rows = await GameBannerModel.findAll({
      where: { isActive: true },
      order: [['sort_order', 'ASC']]
    });
    return rows.map(r => this.map(r));
  }

  async findAll(): Promise<GameBanner[]> {
    const rows = await GameBannerModel.findAll({ order: [['sort_order', 'ASC']] });
    return rows.map(r => this.map(r));
  }

  async findById(id: string): Promise<GameBanner | null> {
    const row = await GameBannerModel.findByPk(id);
    return row ? this.map(row) : null;
  }

  async create(data: CreateGameBannerDto): Promise<GameBanner> {
    const sortOrder =
      data.sortOrder ?? (((await GameBannerModel.max('sortOrder')) as number | null) ?? 0) + 1;
    const row = await GameBannerModel.create({ sortOrder, isActive: true } as any);
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
      sortOrder: plain.sortOrder,
      isActive: plain.isActive,
      imageUrl: plain.imageUrl ?? null,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const gameBannersRepository = new GameBannersRepository();
