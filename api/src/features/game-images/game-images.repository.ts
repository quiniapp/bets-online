import { GameImage } from 'helper';
import { GameImageModel } from './game-image.model';

export class GameImagesRepository {
  async findByGameId(gameId: string): Promise<GameImage[]> {
    const rows = await GameImageModel.findAll({
      where: { gameId },
      order: [['created_at', 'DESC']]
    });
    return rows.map(r => this.map(r));
  }

  async create(data: { gameId: string; url: string; label?: string }): Promise<GameImage> {
    const row = await GameImageModel.create({
      gameId: data.gameId,
      url: data.url,
      label: data.label ?? null
    });
    return this.map(row);
  }

  async findById(id: string): Promise<GameImage | null> {
    const row = await GameImageModel.findByPk(id);
    return row ? this.map(row) : null;
  }

  async delete(id: string): Promise<void> {
    await GameImageModel.destroy({ where: { id } });
  }

  private map(model: GameImageModel): GameImage {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      gameId: plain.gameId,
      url: plain.url,
      label: plain.label ?? null,
      createdAt: new Date(plain.createdAt)
    };
  }
}

export const gameImagesRepository = new GameImagesRepository();
