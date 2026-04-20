import { Router } from 'express';
import { z } from 'zod';
import { gamesController } from '../../controllers/games.controller';
import { gameLaunchController } from '../../controllers/integrations/21viral/gameLaunch.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate, validateParams } from '../../middleware/validation.middleware';
import { UserRole } from 'helper';
import {
  createGameSchema,
  updateGameSchema,
  idParamSchema,
} from 'helper';

const launchGameSchema = z.object({
  playerDeviceType: z.enum(['Desktop', 'Mobile']).default('Desktop'),
  gameMode: z.enum(['Real', 'Demo']).default('Real'),
  lobbyUrl: z.string().url(),
  depositUrl: z.string().url(),
  exitUrl: z.string().url().optional()
});

const router = Router();

// Public routes (no authentication required)
router.get('/', gamesController.getAll.bind(gamesController));
router.get('/:id', validateParams(idParamSchema), gamesController.getById.bind(gamesController));

// Protected routes (authentication required)
router.use(authMiddleware);

router.post(
  '/',
  validate(createGameSchema),
  gamesController.create.bind(gamesController)
);

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(updateGameSchema),
  gamesController.update.bind(gamesController)
);

router.post(
  '/:id/toggle-status',
  validateParams(idParamSchema),
  gamesController.toggleStatus.bind(gamesController)
);

router.delete(
  '/:id',
  validateParams(idParamSchema),
  gamesController.delete.bind(gamesController)
);

router.post(
  '/:id/launch',
  validateParams(idParamSchema),
  requireRole(UserRole.PLAYER),
  validate(launchGameSchema),
  gameLaunchController.launchGame.bind(gameLaunchController)
);

export default router;
