import { Router } from 'express';
import { cashierOwnSettlementsQuerySchema, idParamSchema, UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateParams, validateQuery } from '../../middleware/validation.middleware';
import { cashierAccountsController } from './cashier-accounts.controller';

/**
 * Vista del cajero: su historial de liquidaciones (solo lectura).
 * Se monta en /cashier-accounts/me antes del router del owner.
 */
const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.CASHIER));

router.get(
  '/settlements',
  validateQuery(cashierOwnSettlementsQuerySchema),
  cashierAccountsController.listOwnSettlements.bind(cashierAccountsController)
);

router.get(
  '/settlements/:id/receipt',
  validateParams(idParamSchema),
  cashierAccountsController.ownSettlementReceipt.bind(cashierAccountsController)
);

export default router;
