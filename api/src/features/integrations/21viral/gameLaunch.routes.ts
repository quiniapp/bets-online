import { Router } from 'express';
import { gameLaunchController } from './gameLaunch.controller';
import { authMiddleware, requireRole } from '../../../middleware/auth.middleware';
import { UserRole } from 'helper';

const router = Router();

router.post(
  '/games/sync',
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  gameLaunchController.syncGames.bind(gameLaunchController)
);

export default router;
