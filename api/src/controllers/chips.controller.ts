import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES, ChipMovementType } from 'helper';
import { chipsDomain } from '../domain/chips/chips.domain';

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
        ApiResponseBuilder.success({ movement })
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
        ApiResponseBuilder.success({ movement })
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
}

export const chipsController = new ChipsController();
