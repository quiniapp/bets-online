import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { gameLaunchDomain } from '../../../domain/integrations/21viral/gameLaunch.domain';
import { gameLaunchesRepository } from '../../../persistence/repositories/game-launches.repository';

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
    const { id: gameId } = req.params;
    const { playerDeviceType, gameMode, lobbyUrl, depositUrl, exitUrl } = req.body;
    console.log('[21Viral][launchGame] REQUEST', JSON.stringify({
      userId: req.user?.userId,
      gameId,
      playerDeviceType: playerDeviceType ?? 'Desktop',
      gameMode: gameMode ?? 'Real',
      lobbyUrl,
      depositUrl,
      exitUrl
    }));
    try {
      const gameStartUrl = await gameLaunchDomain.launchGame({
        userId: req.user.userId,
        gameId,
        playerDeviceType: playerDeviceType ?? 'Desktop',
        gameMode: gameMode ?? 'Real',
        lobbyUrl,
        depositUrl,
        exitUrl
      });

      console.log('[21Viral][launchGame] RESPONSE 200', JSON.stringify({ gameStartUrl }));
      gameLaunchesRepository.logLaunch(gameId, req.user.userId).catch(err => {
        console.error('[GameLaunch] Failed to log launch:', err instanceof Error ? err.message : String(err));
      });
      return res.json(ApiResponseBuilder.success({ gameStartUrl }));
    } catch (error) {
      console.log('[21Viral][launchGame] ERROR', error instanceof Error ? error.message : String(error));
      return next(error);
    }
  }
}

export const gameLaunchController = new GameLaunchController();
