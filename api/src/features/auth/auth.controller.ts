import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES } from 'helper';
import { authDomain } from './auth.domain';
import { usersRepository } from '../users/users.repository';
import { userCache } from '../../persistence/cache/user.cache';
import { setAuthCookies, clearAuthCookies } from '../../utils/auth-cookies';

export class AuthController {
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await authDomain.login(username, password);
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      return res.json(ApiResponseBuilder.success({ user: result.user }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Invalid refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies['refresh-token'];

      if (!refreshToken) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'No refresh token provided')
        );
      }

      const tokens = await authDomain.refreshToken(refreshToken);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      return res.json(ApiResponseBuilder.success({}));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.session || req.headers.authorization?.split(' ')[1];
      if (token) {
        await authDomain.logout(token);
      }
      clearAuthCookies(res);
      return res.json(ApiResponseBuilder.success({ message: 'Logout successful' }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/logout-all:
   *   post:
   *     summary: Logout from all devices
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out from all devices
   */
  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      await authDomain.logoutAll(req.user.userId);
      clearAuthCookies(res);
      return res.json(ApiResponseBuilder.success({ message: 'Logged out from all devices' }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *               - confirmPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed successfully
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { currentPassword, newPassword } = req.body;
      await authDomain.changePassword(req.user.userId, currentPassword, newPassword);
      clearAuthCookies(res);
      return res.json(ApiResponseBuilder.success({ message: SUCCESS_MESSAGES.PASSWORD_CHANGED }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user data
   */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      let user = userCache.get(req.user.userId);
      if (!user) {
        user = await usersRepository.findById(req.user.userId);
        if (!user) {
          return res.status(404).json(
            ApiResponseBuilder.error('NOT_FOUND', 'User not found')
          );
        }
        userCache.set(user);
      }

      const { passwordHash: _passwordHash, ...userWithoutPassword } = user as typeof user & { passwordHash?: string };

      return res.json(ApiResponseBuilder.success(userWithoutPassword));
    } catch (error) {
      return next(error);
    }
  }
}

export const authController = new AuthController();
