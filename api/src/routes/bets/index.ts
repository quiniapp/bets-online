import { Router } from 'express';
import { betsController } from '../../controllers/bets.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, validateParams } from '../../middleware/validation.middleware';
import {
  createBetSchema,
  idParamSchema,
} from 'helper';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Place bet
router.post(
  '/',
  validate(createBetSchema),
  betsController.placeBet.bind(betsController)
);

// Current user's bets
router.get('/my-history', betsController.getMyHistory.bind(betsController));
router.get('/my-statistics', betsController.getMyStatistics.bind(betsController));

// Specific user's bets (requires permissions)
router.get(
  '/history/:userId',
  validateParams(idParamSchema),
  betsController.getUserHistory.bind(betsController)
);

router.get(
  '/statistics/:userId',
  validateParams(idParamSchema),
  betsController.getUserStatistics.bind(betsController)
);

// Get bet by ID
router.get(
  '/:id',
  validateParams(idParamSchema),
  betsController.getById.bind(betsController)
);

export default router;
