import { Router } from 'express';
import {
  cancelCashierSettlementSchema,
  cashierAccountListQuerySchema,
  cashierSettlementListQuerySchema,
  createCashierSettlementSchema,
  idParamSchema,
  payCashierSettlementSchema,
  previewCashierSettlementSchema,
  updateCashierCompensationSchema,
  UserRole
} from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate, validateParams, validateQuery } from '../../middleware/validation.middleware';
import { cashierAccountsController } from './cashier-accounts.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER));

// Cashier accounts list + per-cashier detail
router.get(
  '/',
  validateQuery(cashierAccountListQuerySchema),
  cashierAccountsController.list.bind(cashierAccountsController)
);

// Global settlement history. Declared before '/:id' so "settlements" is not
// interpreted as a cashier uuid.
router.get(
  '/settlements',
  validateQuery(cashierSettlementListQuerySchema),
  cashierAccountsController.listSettlements.bind(cashierAccountsController)
);

router.post(
  '/settlements/:id/pay',
  validateParams(idParamSchema),
  validate(payCashierSettlementSchema),
  cashierAccountsController.paySettlement.bind(cashierAccountsController)
);

router.post(
  '/settlements/:id/cancel',
  validateParams(idParamSchema),
  validate(cancelCashierSettlementSchema),
  cashierAccountsController.cancelSettlement.bind(cashierAccountsController)
);

router.get(
  '/:id',
  validateParams(idParamSchema),
  cashierAccountsController.detail.bind(cashierAccountsController)
);

router.get(
  '/:id/preview',
  validateParams(idParamSchema),
  validateQuery(previewCashierSettlementSchema),
  cashierAccountsController.previewSettlement.bind(cashierAccountsController)
);

router.put(
  '/:id/compensation',
  validateParams(idParamSchema),
  validate(updateCashierCompensationSchema),
  cashierAccountsController.updateCompensation.bind(cashierAccountsController)
);

router.post(
  '/:id/settlements',
  validateParams(idParamSchema),
  validate(createCashierSettlementSchema),
  cashierAccountsController.createSettlement.bind(cashierAccountsController)
);

export default router;
