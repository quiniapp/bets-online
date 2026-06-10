import { QueryTypes } from 'sequelize';
import { ProviderGameTypeOrderModel } from '../../persistence/models';
import type { ProviderTypeOrderItem } from 'helper';

export class ProviderTypeOrdersRepository {
  /**
   * Every distinct game_type of the provider's games, in effective order:
   * ruled types first (rule sort), then unruled ones by global game_types
   * sort, then type name. sortOrder is null for types without a rule.
   */
  async findEffectiveByProvider(providerName: string): Promise<ProviderTypeOrderItem[]> {
    const db = ProviderGameTypeOrderModel.sequelize!;
    const rows = await db.query<ProviderTypeOrderItem & { gamesCount: string }>(
      `SELECT g.game_type AS "gameType",
              gt.display_name AS "displayName",
              pgto.sort_order AS "sortOrder",
              g.games_count AS "gamesCount"
       FROM (
         SELECT game_type, COUNT(*) AS games_count FROM games
         WHERE provider_name = :providerName AND game_type IS NOT NULL
         GROUP BY game_type
       ) g
       LEFT JOIN provider_game_type_orders pgto
         ON pgto.provider_name = :providerName AND pgto.game_type = g.game_type
       LEFT JOIN game_types gt ON gt.name = g.game_type
       ORDER BY COALESCE(pgto.sort_order, 2147483647) ASC,
                COALESCE(gt.sort_order, 2147483647) ASC,
                g.game_type ASC`,
      { replacements: { providerName }, type: QueryTypes.SELECT }
    );
    return rows.map(r => ({ ...r, gamesCount: parseInt(String(r.gamesCount), 10) || 0 }));
  }

  /**
   * Replace every rule of the provider in one transaction. Empty items clears
   * all rules; stale types (no longer in the catalog) disappear on next save.
   */
  async replaceAll(providerName: string, items: { gameType: string; sortOrder: number }[]): Promise<void> {
    const db = ProviderGameTypeOrderModel.sequelize!;
    await db.transaction(async transaction => {
      await ProviderGameTypeOrderModel.destroy({ where: { providerName }, transaction });
      if (items.length > 0) {
        await ProviderGameTypeOrderModel.bulkCreate(
          items.map(i => ({ providerName, gameType: i.gameType, sortOrder: i.sortOrder })),
          { transaction }
        );
      }
    });
  }
}

export const providerTypeOrdersRepository = new ProviderTypeOrdersRepository();
