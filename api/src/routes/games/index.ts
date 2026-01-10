import { Router } from 'express';
import { gamesController } from '../../controllers/games.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, validateParams } from '../../middleware/validation.middleware';
import {
  createGameSchema,
  updateGameSchema,
  idParamSchema,
} from 'helper';

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

export default router;
