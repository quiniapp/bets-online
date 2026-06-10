import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES } from 'helper';
import { betsDomain } from './bets.domain';

const parseQueryDate = (v: unknown): Date | undefined => {
  if (typeof v !== 'string' || !v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

export class BetsController {
  /**
   * @swagger
   * /api/admin/reports/bets:
   *   get:
   *     summary: House-wide bets report (OWNER only)
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Totals (rounds, wagered, prizes, balance) + paginated rows
   */
  async getHouseReport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const offset = (page - 1) * limit;

      const result = await betsDomain.getHouseReport(req.user.userId, {
        dateFrom: parseQueryDate(req.query.dateFrom),
        dateTo: parseQueryDate(req.query.dateTo),
        providerName: (req.query.providerName as string) || undefined,
        gameId: (req.query.gameId as string) || undefined,
        userId: (req.query.userId as string) || undefined,
        username: (req.query.username as string) || undefined,
        limit,
        offset
      });

      return res.json({
        success: true,
        data: { totals: result.totals, rows: result.rows },
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) || 1 }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets:
   *   post:
   *     summary: Place a bet
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - gameId
   *               - amount
   *             properties:
   *               gameId:
   *                 type: string
   *               amount:
   *                 type: number
   *     responses:
   *       201:
   *         description: Bet placed successfully
   *       400:
   *         description: Invalid bet amount or insufficient balance
   *       404:
   *         description: Game not found
   */
  async placeBet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const betData = req.body;
      const result = await betsDomain.placeBet(req.user.userId, betData);

      return res.status(201).json(
        ApiResponseBuilder.success({
          bet: result.bet,
          newBalance: result.newBalance,
          message: SUCCESS_MESSAGES.BET_PLACED,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets/my-history:
   *   get:
   *     summary: Get current user's bet history
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of bets per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Offset for pagination
   *       - in: query
   *         name: gameId
   *         schema:
   *           type: string
   *         description: Filter by game ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, WON, LOST, CANCELLED]
   *         description: Filter by bet status
   *     responses:
   *       200:
   *         description: Bet history retrieved successfully
   */
  async getMyHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const gameId = req.query.gameId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await betsDomain.getBetHistory(
        req.user.userId,
        req.user.userId,
        { limit, offset, gameId, status }
      );

      return res.json(
        ApiResponseBuilder.success({
          bets: result.bets,
          total: result.total,
          limit,
          offset,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets/my-statistics:
   *   get:
   *     summary: Get current user's bet statistics
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   */
  async getMyStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const statistics = await betsDomain.getBetStatistics(
        req.user.userId,
        req.user.userId
      );

      return res.json(ApiResponseBuilder.success(statistics));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets/history/{userId}:
   *   get:
   *     summary: Get bet history for a specific user (requires permissions)
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *       - in: query
   *         name: gameId
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, WON, LOST, CANCELLED]
   *     responses:
   *       200:
   *         description: Bet history retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  async getUserHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const gameId = req.query.gameId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await betsDomain.getBetHistory(req.user.userId, userId, {
        limit,
        offset,
        gameId,
        status,
      });

      return res.json(
        ApiResponseBuilder.success({
          bets: result.bets,
          total: result.total,
          limit,
          offset,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets/statistics/{userId}:
   *   get:
   *     summary: Get bet statistics for a specific user (requires permissions)
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  async getUserStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { userId } = req.params;
      const statistics = await betsDomain.getBetStatistics(
        req.user.userId,
        userId
      );

      return res.json(ApiResponseBuilder.success(statistics));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/bets/{id}:
   *   get:
   *     summary: Get bet by ID
   *     tags: [Bets]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Bet ID
   *     responses:
   *       200:
   *         description: Bet retrieved successfully
   *       404:
   *         description: Bet not found
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { id } = req.params;
      const bet = await betsDomain.getBetById(req.user.userId, id);

      return res.json(ApiResponseBuilder.success({ bet }));
    } catch (error) {
      return next(error);
    }
  }
}

export const betsController = new BetsController();
