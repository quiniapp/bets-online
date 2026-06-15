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
  async getOverview(requesterId: string): Promise<AdminStatsOverview> {
    const db = UserModel.sequelize!;

    // Scope every metric to the requester's own subtree (self + descendants),
    // so an admin never sees activity from sibling branches. For an OWNER the
    // subtree spans every user, so totals are unchanged.
    const DESCENDANTS_CTE = `
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE id = :requesterId
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN descendants d ON u.parent_user_id = d.id
      )`;
    const bind = { replacements: { requesterId }, type: QueryTypes.SELECT } as const;

    const [onlineNowResult, newUsersTodayResult, activeUsersTodayResult, weeklyChipFlowResult] =
      await Promise.all([
        db.query<{ count: string }>(
          `${DESCENDANTS_CTE}
           SELECT COUNT(*) AS count
           FROM users
           WHERE id IN (SELECT id FROM descendants)
             AND last_activity > NOW() - INTERVAL '5 minutes'`,
          bind
        ),
        db.query<{ count: string }>(
          `${DESCENDANTS_CTE}
           SELECT COUNT(*) AS count
           FROM users
           WHERE id IN (SELECT id FROM descendants)
             AND created_at >= CURRENT_DATE
             AND role = 'PLAYER'`,
          bind
        ),
        db.query<{ count: string }>(
          `${DESCENDANTS_CTE}
           SELECT COUNT(*) AS count
           FROM users
           WHERE id IN (SELECT id FROM descendants)
             AND last_activity >= CURRENT_DATE`,
          bind
        ),
        // Always returns exactly 7 rows (today and the 6 previous days),
        // zero-filled for days without movements. Movements are scoped to the
        // subtree via cm.user_id (the player/descendant on each movement).
        db.query<{ date: string; loaded: string; withdrawn: string }>(
          `${DESCENDANTS_CTE}
           SELECT
             TO_CHAR(d.day::date, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(CASE WHEN cm.type = 'SELL_TO_PLAYER' THEN cm.amount ELSE 0 END), 0) AS loaded,
             COALESCE(SUM(CASE WHEN cm.type = 'WITHDRAWAL' THEN cm.amount ELSE 0 END), 0) AS withdrawn
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
           LEFT JOIN chip_movements cm
             ON cm.created_at >= d.day::date
            AND cm.created_at < d.day::date + INTERVAL '1 day'
            AND cm.type IN ('SELL_TO_PLAYER', 'WITHDRAWAL')
            AND cm.user_id IN (SELECT id FROM descendants)
           GROUP BY d.day
           ORDER BY d.day ASC`,
          bind
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
