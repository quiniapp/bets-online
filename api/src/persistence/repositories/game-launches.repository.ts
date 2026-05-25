import { QueryTypes } from 'sequelize';
import { GameLaunchModel } from '../models/game-launch.model';

export interface GameAnalyticRow {
  gameId: string;
  gameName: string;
  providerName: string | null;
  gameType: string | null;
  isActive: boolean;
  launchCount: number;
  transactionCount: number;
  totalWagered: number;
  errorRatePct: number;
}

export class GameLaunchesRepository {
  async logLaunch(gameId: string, userId: string): Promise<void> {
    await GameLaunchModel.create({ gameId, userId });
  }

  async getGameAnalytics(dateFrom: Date, dateTo: Date): Promise<GameAnalyticRow[]> {
    const db = GameLaunchModel.sequelize!;

    const rows = await db.query<{
      gameId: string;
      gameName: string;
      providerName: string | null;
      gameType: string | null;
      isActive: boolean;
      launchCount: string;
      transactionCount: string;
      totalWagered: string;
    }>(
      `SELECT
        g.id                                                                        AS "gameId",
        g.name                                                                      AS "gameName",
        g.provider_name                                                             AS "providerName",
        g.game_type                                                                 AS "gameType",
        g.is_active                                                                 AS "isActive",
        COUNT(gl.id)                                                                AS "launchCount",
        COUNT(DISTINCT pt.provider_game_round_id)                                   AS "transactionCount",
        COALESCE(
          SUM(CASE WHEN pt.transaction_type = 'Debit' THEN pt.amount ELSE 0 END), 0
        )                                                                           AS "totalWagered"
      FROM games g
      INNER JOIN game_launches gl
        ON gl.game_id = g.id
        AND gl.created_at >= :dateFrom
        AND gl.created_at <= :dateTo
      LEFT JOIN provider_transactions pt
        ON pt.provider_game_id = g.provider_game_id
        AND g.provider_game_id IS NOT NULL
        AND pt.created_at >= :dateFrom
        AND pt.created_at <= :dateTo
      GROUP BY g.id, g.name, g.provider_name, g.game_type, g.is_active
      ORDER BY COUNT(gl.id) DESC`,
      { replacements: { dateFrom, dateTo }, type: QueryTypes.SELECT }
    );

    return rows.map(r => {
      const launchCount = parseInt(String(r.launchCount), 10) || 0;
      const transactionCount = parseInt(String(r.transactionCount), 10) || 0;
      const totalWagered = parseFloat(String(r.totalWagered)) || 0;
      const rawErrorRate =
        launchCount > 0 ? ((launchCount - transactionCount) / launchCount) * 100 : 0;
      return {
        gameId: r.gameId,
        gameName: r.gameName,
        providerName: r.providerName ?? null,
        gameType: r.gameType ?? null,
        isActive: r.isActive,
        launchCount,
        transactionCount,
        totalWagered,
        errorRatePct: Math.max(0, parseFloat(rawErrorRate.toFixed(2)))
      };
    });
  }
}

export const gameLaunchesRepository = new GameLaunchesRepository();
