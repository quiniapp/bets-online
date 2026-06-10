import { Router } from 'express';
import { UserRole, providerTypeOrdersSchema } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { providerTypeOrdersController } from './provider-type-orders.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/:name/type-orders', (req, res, next) =>
  providerTypeOrdersController.getByProvider(req, res, next));
router.put('/:name/type-orders', validate(providerTypeOrdersSchema), (req, res, next) =>
  providerTypeOrdersController.replace(req, res, next));

export default router;
