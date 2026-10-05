import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/config/sequelize';
import { GamesRepository } from '../../src/features/games/games.repository';

/**
 * Hits the real Postgres (api/.env.local). Seeds one native game and two
 * integrator games under one provider, then checks that top-played and
 * top-providers combine both sources with the documented semantics:
 *   - native: 1 bet = 1 round, CANCELLED excluded, wagered = Σ amount
 *   - provider: 1 round = 1 DISTINCT provider_game_round_id among Debits,
 *     wagered = Σ Debit amount, Credits ignored, linked by provider_game_id only
 */
describe('GamesRepository top-played / top-providers', () => {
  const repo = new GamesRepository();
  const suffix = randomUUID().slice(0, 8);
  const providerName = `TopProv-${suffix}`;
  const userId = randomUUID();
  const nativeId = randomUUID();
  const provBId = randomUUID();
  const provCId = randomUUID();
  const pgB = `pg-B-${suffix}`;
  const pgC = `pg-C-${suffix}`;

  const run = (sql: string, replacements: Record<string, unknown>) =>
    sequelize.query(sql, { replacements, type: QueryTypes.RAW });

  beforeAll(async () => {
    await run(
      `INSERT INTO users (id, role, username, password_hash, status)
       VALUES (:id, 'PLAYER', :username, 'x', 'ACTIVE')`,
      { id: userId, username: `top-played-${suffix}` }
    );

    const insertGame = (id: string, name: string, pgid: string | null) =>
      run(
        `INSERT INTO games (id, name, description, is_active, min_bet, max_bet, house_edge, provider_name, provider_game_id)
         VALUES (:id, :name, 'test', true, 1, 100, 0, :providerName, :pgid)`,
        { id, name, providerName: pgid ? providerName : null, pgid }
      );
    await insertGame(nativeId, `Native ${suffix}`, null);
    await insertGame(provBId, `ProvB ${suffix}`, pgB);
    await insertGame(provCId, `ProvC ${suffix}`, pgC);

    // Native: 3 valid rounds (10 + 20 + 5 = 35) + 1 CANCELLED that must be ignored.
    const bets: Array<[number, string]> = [[10, 'WON'], [20, 'LOST'], [5, 'WON'], [99, 'CANCELLED']];
    for (const [amount, status] of bets) {
      await run(
        `INSERT INTO bets (id, user_id, game_id, amount, status) VALUES (:id, :userId, :gameId, :amount, :status)`,
        { id: randomUUID(), userId, gameId: nativeId, amount, status }
      );
    }

    // Provider B: round r1 = Debit 5 + Credit 50; round r2 = two Debits of 7 (same round → 1 round).
    // Provider C: round r3 = Debit 100.
    const txns: Array<[string, string, string, number]> = [
      [pgB, `r1-${suffix}`, 'Debit', 5],
      [pgB, `r1-${suffix}`, 'Credit', 50],
      [pgB, `r2-${suffix}`, 'Debit', 7],
      [pgB, `r2-${suffix}`, 'Debit', 7],
      [pgC, `r3-${suffix}`, 'Debit', 100]
    ];
    let i = 0;
    for (const [pgid, roundId, type, amount] of txns) {
      await run(
        `INSERT INTO provider_transactions
           (id, provider_name, provider_transaction_id, provider_game_round_id, provider_game_id,
            provider_player_id, user_id, transaction_type, amount, currency, balance_after)
         VALUES (:id, '21viral', :txId, :roundId, :pgid, '1', :userId, :type, :amount, 'ARS', 0)`,
        { id: randomUUID(), txId: `tx-${suffix}-${i++}`, roundId, pgid, userId, type, amount }
      );
    }
  });

  afterAll(async () => {
    await run(`DELETE FROM provider_transactions WHERE user_id = :userId`, { userId });
    await run(`DELETE FROM bets WHERE user_id = :userId`, { userId });
    await run(`DELETE FROM games WHERE id IN (:ids)`, { ids: [nativeId, provBId, provCId] });
    await run(`DELETE FROM users WHERE id = :userId`, { userId });
    await sequelize.close();
  });

  const byId = <T extends { id: string }>(rows: T[], id: string) => rows.find(r => r.id === id);

  it('counts native rounds (excluding CANCELLED) and distinct provider Debit rounds', async () => {
    const rows = await repo.getTopPlayed(20, 'rounds');

    const native = byId(rows, nativeId);
    const provB = byId(rows, provBId);
    const provC = byId(rows, provCId);

    expect(native).toMatchObject({ name: `Native ${suffix}`, isActive: true, betCount: 3, totalWagered: 35 });
    expect(provB).toMatchObject({ betCount: 2, totalWagered: 19 });
    expect(provC).toMatchObject({ betCount: 1, totalWagered: 100 });

    const ours = rows.filter(r => [nativeId, provBId, provCId].includes(r.id)).map(r => r.id);
    expect(ours).toEqual([nativeId, provBId, provCId]);
  });

  it('orders by wagered when sortBy=wagered', async () => {
    const rows = await repo.getTopPlayed(20, 'wagered');
    const ours = rows.filter(r => [nativeId, provBId, provCId].includes(r.id)).map(r => r.id);
    expect(ours).toEqual([provCId, nativeId, provBId]);
  });

  it('respects the limit', async () => {
    const rows = await repo.getTopPlayed(1, 'rounds');
    expect(rows).toHaveLength(1);
  });

  it('aggregates provider totals across its games', async () => {
    const rows = await repo.getTopProviders(20, 'rounds');
    const ours = rows.find(r => r.providerName === providerName);
    expect(ours).toEqual({ providerName, betCount: 3, totalWagered: 119 });
  });
});
