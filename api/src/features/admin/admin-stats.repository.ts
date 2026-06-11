import { QueryTypes } from 'sequelize';
import { UserModel } from '../../persistence/models';

interface WeeklyChipFlowEntry {
  date: string;
  loaded: number;
  withdrawn: number;
}

interface AdminStatsOverview {
  onlineNow: number;
  newUsersToday: number;
  activeUsersToday: number;
  weeklyChipFlow: WeeklyChipFlowEntry[];
}

export class AdminStatsRepository {
  async getOverview(): Promise<AdminStatsOverview> {
    const db = UserModel.sequelize!;

    const [onlineNowResult, newUsersTodayResult, activeUsersTodayResult, weeklyChipFlowResult] =
      await Promise.all([
        db.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM users
           WHERE last_activity > NOW() - INTERVAL '5 minutes'`,
          { type: QueryTypes.SELECT }
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM users
           WHERE created_at >= CURRENT_DATE
             AND role = 'PLAYER'`,
          { type: QueryTypes.SELECT }
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM users
           WHERE last_activity >= CURRENT_DATE`,
          { type: QueryTypes.SELECT }
        ),
        // Always returns exactly 7 rows (today and the 6 previous days),
        // zero-filled for days without movements.
        db.query<{ date: string; loaded: string; withdrawn: string }>(
          `SELECT
             TO_CHAR(d.day::date, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(CASE WHEN cm.type = 'SELL_TO_PLAYER' THEN cm.amount ELSE 0 END), 0) AS loaded,
             COALESCE(SUM(CASE WHEN cm.type = 'WITHDRAWAL' THEN cm.amount ELSE 0 END), 0) AS withdrawn
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
           LEFT JOIN chip_movements cm
             ON cm.created_at >= d.day::date
            AND cm.created_at < d.day::date + INTERVAL '1 day'
            AND cm.type IN ('SELL_TO_PLAYER', 'WITHDRAWAL')
           GROUP BY d.day
           ORDER BY d.day ASC`,
          { type: QueryTypes.SELECT }
        )
      ]);

    return {
      onlineNow: parseInt(onlineNowResult[0]?.count ?? '0', 10),
      newUsersToday: parseInt(newUsersTodayResult[0]?.count ?? '0', 10),
      activeUsersToday: parseInt(activeUsersTodayResult[0]?.count ?? '0', 10),
      weeklyChipFlow: weeklyChipFlowResult.map(row => ({
        date: row.date,
        loaded: parseFloat(row.loaded) || 0,
        withdrawn: parseFloat(row.withdrawn) || 0
      }))
    };
  }
}

export const adminStatsRepository = new AdminStatsRepository();
