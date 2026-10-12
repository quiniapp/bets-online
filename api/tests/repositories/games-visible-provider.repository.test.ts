import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/config/sequelize';
import { GamesRepository } from '../../src/features/games/games.repository';
import { ProvidersRepository } from '../../src/features/providers/providers.repository';
import { BetsRepository } from '../../src/features/bets/bets.repository';
import { ProviderTypeOrdersRepository } from '../../src/features/provider-type-orders/provider-type-orders.repository';

/**
 * Hits the real Postgres (api/.env.local). Provider X has one game whose
 * visible_provider_name is Y; provider Y has its own game. Everything the
 * frontends see must treat the moved game as Y's, while the integrator side
 * keeps the real provider X.
 */
describe('games.visible_provider_name', () => {
  const games = new GamesRepository();
  const providers = new ProvidersRepository();
  const bets = new BetsRepository();
  const typeOrders = new ProviderTypeOrdersRepository();

  const suffix = randomUUID().slice(0, 8);
  const provX = `ProvX-${suffix}`;
  const provY = `ProvY-${suffix}`;
  const userId = randomUUID();
  const movedId = randomUUID();
  const yGameId = randomUUID();
  const gameType = `type-${suffix}`;

  const run = (sql: string, replacements: Record<string, unknown>) =>
    sequelize.query(sql, { replacements, type: QueryTypes.RAW });

  beforeAll(async () => {
    await run(
      `INSERT INTO users (id, role, username, password_hash, status)
       VALUES (:id, 'PLAYER', :username, 'x', 'ACTIVE')`,
      { id: userId, username: `visible-prov-${suffix}` }
    );
    for (const name of [provX, provY]) {
      await run(`INSERT INTO providers (id, name, is_active) VALUES (:id, :name, true)`, { id: randomUUID(), name });
    }
    const insertGame = (id: string, providerName: string, visible: string | null) =>
      run(
        `INSERT INTO games (id, name, description, is_active, min_bet, max_bet, house_edge,
                            provider_name, visible_provider_name, provider_game_id, game_type)
         VALUES (:id, :name, 'test', true, 1, 100, 0, :providerName, :visible, :pgid, :gameType)`,
        { id, name: `Game ${id}`, providerName, visible, pgid: `pg-${id}`, gameType }
      );
    await insertGame(movedId, provX, provY);
    await insertGame(yGameId, provY, null);
    for (const [gameId, amount] of [[movedId, 10], [yGameId, 20]] as const) {
      await run(
        `INSERT INTO bets (id, user_id, game_id, amount, status) VALUES (:id, :userId, :gameId, :amount, 'LOST')`,
        { id: randomUUID(), userId, gameId, amount }
      );
    }
  });

  afterAll(async () => {
    await run(`DELETE FROM bets WHERE user_id = :userId`, { userId });
    await run(`DELETE FROM games WHERE id IN (:ids)`, { ids: [movedId, yGameId] });
    await run(`DELETE FROM providers WHERE name IN (:names)`, { names: [provX, provY] });
    await run(`DELETE FROM users WHERE id = :userId`, { userId });
    await sequelize.close();
  });

  const ours = (names: string[]) => names.filter(n => n === provX || n === provY);

  it('filters by the effective provider and returns it as providerName', async () => {
    const y = await games.findPaginated(1, 50, true, provY);
    expect(y.total).toBe(2);
    expect(y.games.map(g => g.id).sort()).toEqual([movedId, yGameId].sort());
    expect(y.games.every(g => g.providerName === provY)).toBe(true);

    expect((await games.findPaginated(1, 50, true, provX)).total).toBe(0);
    expect((await games.findById(movedId))?.providerName).toBe(provY);
  });

  it('keeps the real provider for 21viral', async () => {
    expect(await games.findProviderRefById(movedId)).toEqual({ providerName: provX, providerGameId: `pg-${movedId}` });
  });

  it('lists only providers that have active games under the effective provider', async () => {
    expect(ours(await games.findDistinctProviders())).toEqual([provY]);
    expect(ours((await providers.findAll()).map(p => p.name))).toEqual([provY]);
  });

  it('aggregates top providers and the house report under the effective provider', async () => {
    const top = await games.getTopProviders(1000, 'rounds');
    expect(top.filter(r => ours([r.providerName]).length)).toEqual([
      { providerName: provY, betCount: 2, totalWagered: 30 }
    ]);

    const report = await bets.getHouseReport({ providerName: provY, userIds: [userId], limit: 10, offset: 0 });
    expect(report.totals.rounds).toBe(2);
    expect(report.rows.map(r => r.providerName)).toEqual([provY, provY]);
  });

  it('counts the moved game in the effective provider type orders', async () => {
    expect(await typeOrders.findEffectiveByProvider(provY)).toEqual([
      expect.objectContaining({ gameType, gamesCount: 2 })
    ]);
  });

  it('bulk status by filter targets the effective provider', async () => {
    expect(await games.bulkSetStatusByFilter(true, provY, gameType)).toBe(2);
    expect(await games.bulkSetStatusByFilter(true, provX, gameType)).toBe(0);
  });
});
