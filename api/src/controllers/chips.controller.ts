import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES, ChipMovementType } from 'helper';
import { chipsDomain } from '../domain/chips/chips.domain';
import { generateMovementsCsv } from '../utils/csv.utils';

export class ChipsController {
  /**
   * @swagger
   * /api/chips/sell:
   *   post:
   *     summary: Sell chips to a player
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - playerId
   *               - amount
   *             properties:
   *               playerId:
   *                 type: string
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Chips sold successfully
   */
  async sell(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { playerId, amount, description } = req.body;

      const movement = await chipsDomain.sellChips(
        req.user.userId,
        playerId,
        amount,
        description
      );

      return res.json(
        ApiResponseBuilder.success({
          movement,
          newBalance: movement.newBalance,
          message: SUCCESS_MESSAGES.CHIPS_SOLD
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/prize:
   *   post:
   *     summary: Pay prize to a player
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - playerId
   *               - amount
   *             properties:
   *               playerId:
   *                 type: string
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Prize paid successfully
   */
  async payPrize(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { playerId, amount, description } = req.body;

      const movement = await chipsDomain.payPrize(
        req.user.userId,
        playerId,
        amount,
        description
      );

      return res.json(
        ApiResponseBuilder.success({
          movement,
          newBalance: movement.newBalance,
          message: SUCCESS_MESSAGES.PRIZE_PAID
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/loss:
   *   post:
   *     summary: Register a loss for a player
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - playerId
   *               - amount
   *             properties:
   *               playerId:
   *                 type: string
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Loss registered successfully
   */
  async registerLoss(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { playerId, amount, description } = req.body;

      const movement = await chipsDomain.registerLoss(
        req.user.userId,
        playerId,
        amount,
        description
      );

      return res.json(
        ApiResponseBuilder.success({
          movement,
          newBalance: movement.newBalance,
          message: SUCCESS_MESSAGES.LOSS_REGISTERED
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/withdraw:
   *   post:
   *     summary: Withdraw chips
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - playerId
   *               - amount
   *             properties:
   *               playerId:
   *                 type: string
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Withdrawal successful
   */
  async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { playerId, amount, description } = req.body;

      const movement = await chipsDomain.withdraw(
        req.user.userId,
        playerId,
        amount,
        description
      );

      return res.json(
        ApiResponseBuilder.success({
          movement,
          newBalance: movement.newBalance,
          message: SUCCESS_MESSAGES.WITHDRAWAL_PROCESSED
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/movements/{userId}:
   *   get:
   *     summary: Get movement history for a user
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Movement history
   */
  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { userId } = req.params;
      const { page, limit, startDate, endDate, type } = req.query;

      const result = await chipsDomain.getMovementHistory(
        req.user.userId,
        userId,
        {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          type: type as ChipMovementType | undefined
        }
      );

      return res.json(
        ApiResponseBuilder.paginated(
          result.movements,
          result.page,
          result.limit,
          result.total
        )
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/balance/{userId}:
   *   get:
   *     summary: Get balance for a user
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { userId } = req.params;

      const balance = await chipsDomain.getBalance(req.user.userId, userId);

      return res.json(ApiResponseBuilder.success({ balance }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/my-balance:
   *   get:
   *     summary: Get current user's balance
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User balance
   */
  async getMyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const balance = await chipsDomain.getBalance(req.user.userId, req.user.userId);

      return res.json(ApiResponseBuilder.success({ balance }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/chips/movements/{userId}/export:
   *   get:
   *     summary: Export movement history as CSV
   *     tags: [Chips]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: CSV file
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   */
  async exportMovements(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { userId } = req.params;
      const { startDate, endDate, type } = req.query;

      // Get all movements without pagination for export
      const result = await chipsDomain.getMovementHistory(
        req.user.userId,
        userId,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          type: type as ChipMovementType | undefined,
          limit: 10000 // Large limit for export
        }
      );

      const csv = generateMovementsCsv(result.movements);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=movimientos-${userId}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv); // UTF-8 BOM for Excel compatibility
    } catch (error) {
      return next(error);
    }
  }
}

export const chipsController = new ChipsController();
