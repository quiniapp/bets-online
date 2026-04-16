import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimiter.middleware';
import {
  loginSchema,
  changePasswordSchema
} from 'helper';

const router = Router();

// Public routes
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));

// refreshToken viene por cookie httpOnly; no requiere validación de body
router.post('/refresh', authLimiter, authController.refresh.bind(authController));

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
