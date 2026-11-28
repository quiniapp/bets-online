import { Router } from 'express';
import {
  adminChipPurchaseListQuerySchema,
  cancelAdminChipPurchaseSchema,
  confirmAdminChipPurchaseSchema,
  createAdminChipPurchaseSchema,
  idParamSchema,
  updateAdminChipPricingSchema,
  UserRole
} from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate, validateParams, validateQuery } from '../../middleware/validation.middleware';
import { adminChipPurchasesController as controller } from './admin-chip-purchases.controller';

/** Compra de fichas de los admins (owner → admin). Solo el owner. */
const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER));

router.get('/admins', controller.listAdmins.bind(controller));

router.put(
  '/admins/:id/pricing',
  validateParams(idParamSchema),
  validate(updateAdminChipPricingSchema),
  controller.updatePricing.bind(controller)
);

router.delete(
  '/admins/:id/pricing',
  validateParams(idParamSchema),
  controller.resetPricing.bind(controller)
);

router.get('/', validateQuery(adminChipPurchaseListQuerySchema), controller.list.bind(controller));

router.post('/', validate(createAdminChipPurchaseSchema), controller.create.bind(controller));

router.get('/:id/receipt', validateParams(idParamSchema), controller.receipt.bind(controller));

router.post(
  '/:id/confirm',
  validateParams(idParamSchema),
  validate(confirmAdminChipPurchaseSchema),
  controller.confirm.bind(controller)
);

router.post(
  '/:id/cancel',
  validateParams(idParamSchema),
  validate(cancelAdminChipPurchaseSchema),
  controller.cancel.bind(controller)
);

export default router;
