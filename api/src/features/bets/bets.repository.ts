import { BetModel, BetStatus } from './bet.model';
import { Bet } from 'helper';
import { Transaction, WhereOptions, QueryTypes } from 'sequelize';

export interface HouseReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  providerName?: string;
  gameId?: string;
  /** Pre-resolved set of user ids (a user + descendants) to scope the report to. */
  userIds?: string[];
  limit: number;
  offset: number;
}

export interface HouseReportTotals {
  rounds: number;
  wagered: number;
  prizes: number;
  /** House balance / GGR = wagered - prizes. */
  balance: number;
}

export interface HouseReportRow {
  source: 'native' | 'provider';
  id: string;
  userId: string;
  username: string;
  gameName: string;
  providerName: string | null;
  wagered: number;
  prize: number;
  status: string | null;
  createdAt: Date;
}

export interface HouseReportResult {
  totals: HouseReportTotals;
  rows: HouseReportRow[];
  total: number;
}

export interface CreateBetData {
  userId: string;
  gameId: string;
  amount: number;
  status?: BetStatus;
  multiplier?: number;
  payout?: number;
  resultData?: Record<string, unknown>;
  [key: string]: unknown;
}

export class BetsRepository {
  async create(betData: CreateBetData, transaction?: Transaction): Promise<Bet> {
    const bet = await BetModel.create(betData as any, { transaction });
    return this.mapToBet(bet);
  }

  async findById(betId: string): Promise<Bet | null> {
    const bet = await BetModel.findByPk(betId);
    if (!bet) return null;
    return this.mapToBet(bet);
  }

  async findByUserId(
    userId: string,
    options: {
      limit: number;
      offset: number;
      gameId?: string;
      status?: string;
    }
  ): Promise<{ bets: Bet[]; total: number }> {
    const where: WhereOptions = { userId };

    if (options.gameId) {
      where.gameId = options.gameId;
    }

    if (options.status) {
      where.status = options.status;
    }

    const { rows, count } = await BetModel.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      bets: rows.map(r => this.mapToBet(r)),
      total: count,
    };
  }

  async getStatistics(userId: string) {
    const bets = await BetModel.findAll({ where: { userId } });

    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === BetStatus.WON).length;
    const lostBets = bets.filter(b => b.status === BetStatus.LOST).length;
    const totalWagered = bets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPayout = bets
      .filter(b => b.status === BetStatus.WON)
      .reduce((sum, b) => sum + Number(b.payout || 0), 0);
    const netProfit = totalPayout - totalWagered;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    return {
      totalBets,
      wonBets,
      lostBets,
      totalWagered,
      totalPayout,
      netProfit,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  async countByUserId(userId: string): Promise<number> {
    return await BetModel.count({ where: { userId } });
  }

  async findRecentBets(userId: string, limit: number = 10): Promise<Bet[]> {
    const bets = await BetModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
    return bets.map(b => this.mapToBet(b));
  }

  /**
   * House-wide report combining native bets and integrator (21viral) rounds.
   *
   * Native: 1 bet = 1 round; wagered = amount, prize = payout (WON), excludes CANCELLED.
   * Provider: 1 round = 1 distinct provider_game_round_id; wagered = Σ Debit, prize = Σ Credit.
   * Both join `games` for name/provider; provider txns link via provider_game_id
   * (NOT provider_name — pt.provider_name is the integrator '21viral', g.provider_name
   * is the real provider e.g. Pragmatic). Reversals (refunds) are not netted in v1.
   *
   * Returns aggregate totals plus a paginated, unified, date-desc row list.
   */
  async getHouseReport(filters: HouseReportFilters): Promise<HouseReportResult> {
    const db = BetModel.sequelize!;
    const { dateFrom, dateTo, providerName, gameId, userIds, limit, offset } = filters;

    const repl: Record<string, unknown> = { limit, offset };
    const nativeF: string[] = [];
    const provF: string[] = [];

    if (dateFrom) { repl.dateFrom = dateFrom; nativeF.push('b.created_at >= :dateFrom'); provF.push('pt.created_at >= :dateFrom'); }
    if (dateTo) { repl.dateTo = dateTo; nativeF.push('b.created_at <= :dateTo'); provF.push('pt.created_at <= :dateTo'); }
    if (providerName) { repl.providerName = providerName; nativeF.push('g.provider_name = :providerName'); provF.push('g.provider_name = :providerName'); }
    if (gameId) { repl.gameId = gameId; nativeF.push('b.game_id = :gameId'); provF.push('g.id = :gameId'); }
    if (userIds && userIds.length) { repl.userIds = userIds; nativeF.push('b.user_id IN (:userIds)'); provF.push('pt.user_id IN (:userIds)'); }

    const natSql = nativeF.length ? 'AND ' + nativeF.join(' AND ') : '';
    const provSql = provF.length ? 'AND ' + provF.join(' AND ') : '';

    // Aggregate totals (native + provider), summed in JS.
    const nativeTotalsSql = `
      SELECT
        COUNT(*) FILTER (WHERE b.status <> 'CANCELLED') AS rounds,
        COALESCE(SUM(b.amount) FILTER (WHERE b.status <> 'CANCELLED'), 0) AS wagered,
        COALESCE(SUM(b.payout) FILTER (WHERE b.status = 'WON'), 0) AS prizes
      FROM bets b
      JOIN games g ON g.id = b.game_id
      WHERE 1=1 ${natSql}`;

    const provTotalsSql = `
      SELECT
        COUNT(DISTINCT pt.provider_game_round_id) FILTER (WHERE pt.transaction_type = 'Debit') AS rounds,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.transaction_type = 'Debit'), 0) AS wagered,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.transaction_type = 'Credit'), 0) AS prizes
      FROM provider_transactions pt
      LEFT JOIN games g ON g.provider_game_id = pt.provider_game_id
      WHERE 1=1 ${provSql}`;

    // Unified, paginated row list (one row per native bet / per provider round).
    const innerSql = `
      SELECT 'native' AS source, b.id::text AS id, b.user_id, u.username, g.name AS game_name, g.provider_name,
             b.amount AS wagered, CASE WHEN b.status = 'WON' THEN COALESCE(b.payout, 0) ELSE 0 END AS prize,
             b.status::text AS status, b.created_at
      FROM bets b
      JOIN games g ON g.id = b.game_id
      JOIN users u ON u.id = b.user_id
      WHERE b.status <> 'CANCELLED' ${natSql}
      UNION ALL
      SELECT 'provider' AS source, pt.provider_game_round_id AS id, pt.user_id, u.username, g.name AS game_name, g.provider_name,
             COALESCE(SUM(pt.amount) FILTER (WHERE pt.transaction_type = 'Debit'), 0) AS wagered,
             COALESCE(SUM(pt.amount) FILTER (WHERE pt.transaction_type = 'Credit'), 0) AS prize,
             NULL::text AS status, MAX(pt.created_at) AS created_at
      FROM provider_transactions pt
      JOIN games g ON g.provider_game_id = pt.provider_game_id
      JOIN users u ON u.id = pt.user_id
      WHERE pt.provider_game_round_id IS NOT NULL ${provSql}
      GROUP BY pt.provider_game_round_id, pt.user_id, u.username, g.name, g.provider_name`;

    const listSql = `
      SELECT source, id, user_id AS "userId", username, game_name AS "gameName", provider_name AS "providerName",
             wagered, prize, status, created_at AS "createdAt"
      FROM ( ${innerSql} ) t
      ORDER BY t.created_at DESC
      LIMIT :limit OFFSET :offset`;

    const countSql = `SELECT COUNT(*)::int AS total FROM ( ${innerSql} ) t`;

    type TotalsRow = { rounds: string; wagered: string; prizes: string };
    type ListRow = {
      source: 'native' | 'provider'; id: string; userId: string; username: string;
      gameName: string; providerName: string | null; wagered: string; prize: string;
      status: string | null; createdAt: string;
    };

    const [nativeTotals, provTotals, rawRows, countRows] = await Promise.all([
      db.query<TotalsRow>(nativeTotalsSql, { replacements: repl, type: QueryTypes.SELECT }),
      db.query<TotalsRow>(provTotalsSql, { replacements: repl, type: QueryTypes.SELECT }),
      db.query<ListRow>(listSql, { replacements: repl, type: QueryTypes.SELECT }),
      db.query<{ total: number }>(countSql, { replacements: repl, type: QueryTypes.SELECT })
    ]);

    const nt = nativeTotals[0] ?? { rounds: '0', wagered: '0', prizes: '0' };
    const pt = provTotals[0] ?? { rounds: '0', wagered: '0', prizes: '0' };

    const rounds = (parseInt(nt.rounds, 10) || 0) + (parseInt(pt.rounds, 10) || 0);
    const wagered = (parseFloat(nt.wagered) || 0) + (parseFloat(pt.wagered) || 0);
    const prizes = (parseFloat(nt.prizes) || 0) + (parseFloat(pt.prizes) || 0);

    return {
      totals: { rounds, wagered, prizes, balance: wagered - prizes },
      rows: rawRows.map(r => ({
        source: r.source,
        id: r.id,
        userId: r.userId,
        username: r.username,
        gameName: r.gameName,
        providerName: r.providerName,
        wagered: parseFloat(r.wagered) || 0,
        prize: parseFloat(r.prize) || 0,
        status: r.status,
        createdAt: new Date(r.createdAt)
      })),
      total: countRows[0]?.total ?? 0
    };
  }

  private mapToBet(data: BetModel | Record<string, unknown>): Bet {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof BetModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      userId: (plain.userId || plain.user_id) as string,
      gameId: (plain.gameId || plain.game_id) as string,
      amount: parseFloat(String(plain.amount)),
      status: (plain.status as BetStatus),
      multiplier: plain.multiplier ? parseFloat(String(plain.multiplier)) : null,
      payout: plain.payout ? parseFloat(String(plain.payout)) : null,
      resultData: plain.resultData || plain.result_data || null,
      createdAt: new Date(plain.createdAt || plain.created_at),
      settledAt: plain.settledAt || plain.settled_at ? new Date(plain.settledAt || plain.settled_at) : null
    };
  }
}

export const betsRepository = new BetsRepository();
