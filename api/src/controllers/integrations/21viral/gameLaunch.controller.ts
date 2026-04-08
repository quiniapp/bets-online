import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { gameLaunchDomain } from '../../../domain/integrations/21viral/gameLaunch.domain';

export class GameLaunchController {
  /**
   * @swagger
   * /api/integrations/21viral/games/sync:
   *   post:
   *     summary: Sync 21Viral game catalog (OWNER/ADMIN only)
   *     tags: [21Viral Integration]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sync completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     synced:
   *                       type: number
   */
  async syncGames(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await gameLaunchDomain.syncGames();
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}/launch:
   *   post:
   *     summary: Launch a game session for the authenticated player
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
   *             required:
   *               - playerDeviceType
   *               - lobbyUrl
   *               - depositUrl
   *             properties:
   *               playerDeviceType:
   *                 type: string
   *                 enum: [Desktop, Mobile]
   *               gameMode:
   *                 type: string
   *                 enum: [Real, Demo]
   *               lobbyUrl:
   *                 type: string
   *               depositUrl:
   *                 type: string
   *               exitUrl:
   *                 type: string
   *     responses:
   *       200:
   *         description: Game session URL
   */
  async launchGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId } = req.params;
      const { playerDeviceType, gameMode, lobbyUrl, depositUrl, exitUrl } = req.body;

      const gameStartUrl = await gameLaunchDomain.launchGame({
        userId: req.user.userId,
        gameId,
        playerDeviceType: playerDeviceType ?? 'Desktop',
        gameMode: gameMode ?? 'Real',
        lobbyUrl,
        depositUrl,
        exitUrl
      });

      return res.json(ApiResponseBuilder.success({ gameStartUrl }));
    } catch (error) {
      return next(error);
    }
  }
}

export const gameLaunchController = new GameLaunchController();
