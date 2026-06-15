import { Router } from 'express';
import { chipsController } from './chips.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate, validateParams } from '../../middleware/validation.middleware';
import {
  sellChipsSchema,
  payPrizeSchema,
  idParamSchema,
  UserRole
} from 'helper';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Chip operations — only OWNER, ADMIN, CASHIER can operate chips
const chipOperatorRole = requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER);

router.post(
  '/sell',
  chipOperatorRole,
  validate(sellChipsSchema),
  chipsController.sell.bind(chipsController)
);

router.post(
  '/prize',
  chipOperatorRole,
  validate(payPrizeSchema),
  chipsController.payPrize.bind(chipsController)
);

router.post(
  '/loss',
  chipOperatorRole,
  validate(payPrizeSchema),
  chipsController.registerLoss.bind(chipsController)
);

router.post(
  '/withdraw',
  chipOperatorRole,
  validate(payPrizeSchema),
  chipsController.withdraw.bind(chipsController)
);

// Balance and movements
router.get('/my-balance', chipsController.getMyBalance.bind(chipsController));

router.get(
  '/balance/:id',
  validateParams(idParamSchema),
  chipsController.getBalance.bind(chipsController)
);

// Current user's own movements. Declared before '/movements/:id' so the literal
// "me" is matched here instead of failing the uuid param validation below.
router.get('/movements/me', (req, res, next) => {
  (req.params as Record<string, string>).id = req.user!.userId;
  return chipsController.getMovements(req, res, next);
});

router.get(
  '/movements/:id',
  validateParams(idParamSchema),
  chipsController.getMovements.bind(chipsController)
);

router.get(
  '/movements/:id/export',
  validateParams(idParamSchema),
  chipsController.exportMovements.bind(chipsController)
);

export default router;
