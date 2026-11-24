import { Router } from 'express';
import { adminChipPurchaseListQuerySchema, idParamSchema, UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateParams, validateQuery } from '../../middleware/validation.middleware';
import { adminChipPurchasesController as controller } from './admin-chip-purchases.controller';

/**
 * Vista del admin: sus compras de fichas y comprobantes (solo lectura).
 * Se monta en /admin-chip-purchases/me antes del router del owner.
 */
const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

router.get('/', validateQuery(adminChipPurchaseListQuerySchema), controller.listOwn.bind(controller));

router.get('/:id/receipt', validateParams(idParamSchema), controller.ownReceipt.bind(controller));

export default router;
