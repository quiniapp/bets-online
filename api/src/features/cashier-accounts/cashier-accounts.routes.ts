import { Router } from 'express';
import {
  cancelCashierSettlementSchema,
  cashierAccountListQuerySchema,
  cashierCutoffQuerySchema,
  cashierPeriodQuerySchema,
  cashierSettlementListQuerySchema,
  confirmCashierSettlementCollectionSchema,
  createCashierCollectionSchema,
  createCashierSettlementSchema,
  idParamSchema,
  updateCashierCompensationSchema,
  UserRole
} from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate, validateParams, validateQuery } from '../../middleware/validation.middleware';
import { cashierAccountsController } from './cashier-accounts.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER));

// Cuenta corriente a una fecha de corte y cuenta del owner. Declaradas antes de '/:id'
// para que "period" y "owner" no se interpreten como uuid de cajero.
router.get(
  '/period',
  validateQuery(cashierCutoffQuerySchema),
  cashierAccountsController.getPeriodAccounts.bind(cashierAccountsController)
);

router.get(
  '/period/summary.pdf',
  validateQuery(cashierCutoffQuerySchema),
  cashierAccountsController.periodSummaryReceipt.bind(cashierAccountsController)
);

router.get(
  '/owner',
  validateQuery(cashierPeriodQuerySchema),
  cashierAccountsController.ownerAccount.bind(cashierAccountsController)
);

router.get(
  '/owner/summary.pdf',
  validateQuery(cashierPeriodQuerySchema),
  cashierAccountsController.ownerAccountReceipt.bind(cashierAccountsController)
);

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

router.get(
  '/settlements/:id/receipt',
  validateParams(idParamSchema),
  cashierAccountsController.settlementReceipt.bind(cashierAccountsController)
);

router.post(
  '/settlements/:id/confirm-collection',
  validateParams(idParamSchema),
  validate(confirmCashierSettlementCollectionSchema),
  cashierAccountsController.confirmSettlementCollection.bind(cashierAccountsController)
);

// Anular un cobro a cuenta que todavía no se liquidó.
router.post(
  '/collections/:id/cancel',
  validateParams(idParamSchema),
  cashierAccountsController.cancelOnAccountCollection.bind(cashierAccountsController)
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
  validateQuery(cashierCutoffQuerySchema),
  cashierAccountsController.previewSettlement.bind(cashierAccountsController)
);

router.put(
  '/:id/compensation',
  validateParams(idParamSchema),
  validate(updateCashierCompensationSchema),
  cashierAccountsController.updateCompensation.bind(cashierAccountsController)
);

// Cobros a cuenta (durante la semana): se descuentan en la próxima liquidación.
router.get(
  '/:id/collections',
  validateParams(idParamSchema),
  cashierAccountsController.listOnAccountCollections.bind(cashierAccountsController)
);

router.post(
  '/:id/collections',
  validateParams(idParamSchema),
  validate(createCashierCollectionSchema),
  cashierAccountsController.createOnAccountCollection.bind(cashierAccountsController)
);

router.post(
  '/:id/settlements',
  validateParams(idParamSchema),
  validate(createCashierSettlementSchema),
  cashierAccountsController.createSettlement.bind(cashierAccountsController)
);

export default router;
