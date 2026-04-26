import { GameTypeModel } from '../models/game-type.model';
import { GameType, UpdateGameTypeDto } from 'helper';

export class GameTypesRepository {
  async findAll(): Promise<GameType[]> {
    const rows = await GameTypeModel.findAll({
      order: [
        [GameTypeModel.sequelize!.literal(`COALESCE("GameTypeModel"."sort_order", 2147483647)`), 'ASC'],
        ['name', 'ASC']
      ]
    });
    return rows.map(r => this.map(r));
  }

  async findByName(name: string): Promise<GameType | null> {
    const row = await GameTypeModel.findOne({ where: { name } });
    return row ? this.map(row) : null;
  }

  async upsertByName(name: string): Promise<GameType> {
    const [row] = await GameTypeModel.findOrCreate({
      where: { name },
      defaults: { name }
    });
    return this.map(row);
  }

  async update(name: string, data: UpdateGameTypeDto): Promise<GameType | null> {
    const row = await GameTypeModel.findOne({ where: { name } });
    if (!row) return null;
    await row.update(data);
    return this.map(row);
  }

  private map(model: GameTypeModel): GameType {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      name: plain.name,
      displayName: plain.displayName ?? null,
      sortOrder: plain.sortOrder ?? null,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const gameTypesRepository = new GameTypesRepository();
