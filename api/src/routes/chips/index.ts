import { Router } from 'express';
import { chipsController } from '../../controllers/chips.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, validateParams } from '../../middleware/validation.middleware';
import {
  sellChipsSchema,
  payPrizeSchema,
  idParamSchema
} from 'helper';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Chip operations
router.post(
  '/sell',
  validate(sellChipsSchema),
  chipsController.sell.bind(chipsController)
);

router.post(
  '/prize',
  validate(payPrizeSchema),
  chipsController.payPrize.bind(chipsController)
);

router.post(
  '/loss',
  validate(payPrizeSchema), // Same schema as prize
  chipsController.registerLoss.bind(chipsController)
);

router.post(
  '/withdraw',
  validate(payPrizeSchema), // Same schema structure
  chipsController.withdraw.bind(chipsController)
);

// Balance and movements
router.get('/my-balance', chipsController.getMyBalance.bind(chipsController));

router.get(
  '/balance/:userId',
  validateParams(idParamSchema),
  chipsController.getBalance.bind(chipsController)
);

router.get(
  '/movements/:userId',
  validateParams(idParamSchema),
  chipsController.getMovements.bind(chipsController)
);

router.get(
  '/movements/:userId/export',
  validateParams(idParamSchema),
  chipsController.exportMovements.bind(chipsController)
);

export default router;
