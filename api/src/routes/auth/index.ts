import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema
} from 'helper';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), authController.login.bind(authController));

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh.bind(authController)
);

// Protected routes
router.post('/logout', authController.logout.bind(authController));

router.post(
  '/logout-all',
  authMiddleware,
  authController.logoutAll.bind(authController)
);

router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword.bind(authController)
);

router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
