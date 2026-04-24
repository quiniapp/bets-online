import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES } from 'helper';
import { gamesDomain } from '../domain/games/games.domain';

export class GamesController {
  /**
   * @swagger
   * /api/games:
   *   get:
   *     summary: Get all games
   *     tags: [Games]
   *     parameters:
   *       - in: query
   *         name: activeOnly
   *         schema:
   *           type: boolean
   *         description: Filter only active games
   *     responses:
   *       200:
   *         description: List of games retrieved successfully
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const providerName = req.query.providerName as string | undefined;
      const search = req.query.search as string | undefined;
      const gameType = req.query.gameType as string | undefined;
      const { games, total } = await gamesDomain.getPaginatedGames(page, limit, activeOnly, providerName, search, gameType);

      return res.json(ApiResponseBuilder.paginated(games, page, limit, total));
    } catch (error) {
      return next(error);
    }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await gamesDomain.getStats();
      return res.json(ApiResponseBuilder.success(data));
    } catch (error) {
      return next(error);
    }
  }

  async topPlayed(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(20, parseInt(req.query.limit as string) || 5);
      const data = await gamesDomain.getTopPlayed(limit);
      return res.json(ApiResponseBuilder.success(data));
    } catch (error) {
      return next(error);
    }
  }

  async getTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await gamesDomain.getDistinctGameTypes();
      return res.json(ApiResponseBuilder.success({ types }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}:
   *   get:
   *     summary: Get game by ID
   *     tags: [Games]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Game ID
   *     responses:
   *       200:
   *         description: Game retrieved successfully
   *       404:
   *         description: Game not found
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const game = await gamesDomain.getGameById(id);

      return res.json(ApiResponseBuilder.success({ game }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games:
   *   post:
   *     summary: Create a new game (OWNER/ADMIN only)
   *     tags: [Games]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - description
   *               - minBet
   *               - maxBet
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               minBet:
   *                 type: number
   *               maxBet:
   *                 type: number
   *               houseEdge:
   *                 type: number
   *               providerId:
   *                 type: string
   *     responses:
   *       201:
   *         description: Game created successfully
   *       403:
   *         description: Insufficient permissions
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const gameData = req.body;
      const game = await gamesDomain.createGame(req.user.userId, gameData);

      return res.status(201).json(
        ApiResponseBuilder.success({
          game,
          message: SUCCESS_MESSAGES.GAME_CREATED,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}:
   *   patch:
   *     summary: Update a game (OWNER/ADMIN only)
   *     tags: [Games]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Game ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *               minBet:
   *                 type: number
   *               maxBet:
   *                 type: number
   *               houseEdge:
   *                 type: number
   *     responses:
   *       200:
   *         description: Game updated successfully
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Game not found
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { id } = req.params;
      const updateData = req.body;

      const game = await gamesDomain.updateGame(
        req.user.userId,
        id,
        updateData
      );

      return res.json(
        ApiResponseBuilder.success({
          game,
          message: SUCCESS_MESSAGES.GAME_UPDATED,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}/toggle-status:
   *   post:
   *     summary: Toggle game active status (OWNER/ADMIN only)
   *     tags: [Games]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Game ID
   *     responses:
   *       200:
   *         description: Game status toggled successfully
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Game not found
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { id } = req.params;
      const game = await gamesDomain.toggleGameStatus(req.user.userId, id);

      return res.json(
        ApiResponseBuilder.success({
          game,
          message: `Game ${game.isActive ? 'activated' : 'deactivated'} successfully`,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}:
   *   delete:
   *     summary: Delete a game (OWNER only)
   *     tags: [Games]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Game ID
   *     responses:
   *       200:
   *         description: Game deleted successfully
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Game not found
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { id } = req.params;
      await gamesDomain.deleteGame(req.user.userId, id);

      return res.json(
        ApiResponseBuilder.success({
          message: 'Game deleted successfully',
        })
      );
    } catch (error) {
      return next(error);
    }
  }
}

export const gamesController = new GamesController();
