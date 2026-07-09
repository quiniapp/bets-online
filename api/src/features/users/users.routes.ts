import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { UserRole } from 'helper';
import { validate, validateParams } from '../../middleware/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  idParamSchema
} from 'helper';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// User CRUD
router.post('/', validate(createUserSchema), usersController.create.bind(usersController));

router.get(
  '/:id',
  validateParams(idParamSchema),
  usersController.getById.bind(usersController)
);

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(updateUserSchema),
  usersController.update.bind(usersController)
);

// User hierarchy
router.get('/me/stats', usersController.myStats.bind(usersController));
router.get('/me/descendants', usersController.searchDescendants.bind(usersController));
router.get('/me/children', usersController.getMyChildren.bind(usersController));

router.get('/me/tree', usersController.getMyTree.bind(usersController));

router.get(
  '/:id/children',
  validateParams(idParamSchema),
  usersController.getChildren.bind(usersController)
);

router.get(
  '/:id/tree',
  validateParams(idParamSchema),
  usersController.getTree.bind(usersController)
);

// User management
router.post(
  '/:id/block',
  validateParams(idParamSchema),
  usersController.block.bind(usersController)
);

router.post(
  '/:id/unblock',
  validateParams(idParamSchema),
  usersController.unblock.bind(usersController)
);

// Promote cashier → admin. Role also re-checked in the domain against the DB
// (the JWT role could be stale); this middleware is the cheap first gate.
router.post(
  '/:id/promote',
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  validateParams(idParamSchema),
  usersController.promote.bind(usersController)
);

router.post(
  '/:id/reset-password',
  validateParams(idParamSchema),
  validate(resetPasswordSchema),
  usersController.resetPassword.bind(usersController)
);

export default router;
