import { Op, literal } from 'sequelize';
import { ProviderModel } from '../models/provider.model';
import { Provider } from 'helper';

export class ProvidersRepository {
  async findAll(): Promise<Provider[]> {
    const rows = await ProviderModel.findAll({
      where: {
        name: {
          [Op.in]: literal(
            `(SELECT DISTINCT provider_name FROM games WHERE is_active = true AND provider_name IS NOT NULL)`
          )
        }
      },
      order: [
        [literal(`COALESCE("ProviderModel"."sort_order", 2147483647)`), 'ASC'],
        ['name', 'ASC']
      ]
    });
    return rows.map(r => this.map(r));
  }

  async findByName(name: string): Promise<Provider | null> {
    const row = await ProviderModel.findOne({ where: { name } });
    return row ? this.map(row) : null;
  }

  async upsertByName(name: string): Promise<Provider> {
    const [row] = await ProviderModel.findOrCreate({
      where: { name },
      defaults: { name, isActive: true }
    });
    return this.map(row);
  }

  async update(
    name: string,
    data: { displayName?: string; isActive?: boolean; logoUrl?: string }
  ): Promise<Provider | null> {
    const row = await ProviderModel.findOne({ where: { name } });
    if (!row) return null;
    await row.update(data);
    return this.map(row);
  }

  private map(model: ProviderModel): Provider {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      name: plain.name,
      displayName: plain.displayName ?? null,
      isActive: plain.isActive,
      logoUrl: plain.logoUrl ?? null,
      sortOrder: plain.sortOrder ?? null,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const providersRepository = new ProvidersRepository();
