import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, SUCCESS_MESSAGES } from 'helper';
import { usersDomain } from '../domain/users/users.domain';

export class UsersController {
  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Create a new user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - role
   *               - username
   *               - email
   *               - password
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [ADMIN, CASHIER, PLAYER]
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       201:
   *         description: User created successfully
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const user = await usersDomain.createUser(req.user.userId, req.body);

      return res.status(201).json(
        ApiResponseBuilder.success({ user, message: SUCCESS_MESSAGES.USER_CREATED })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User data
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const user = await usersDomain.getUserById(req.user.userId, req.params.id);

      return res.json(ApiResponseBuilder.success({ user }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}/children:
   *   get:
   *     summary: Get user's children
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of child users
   */
  async getChildren(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const userId = req.params.id || req.user.userId;
      const children = await usersDomain.getUserChildren(req.user.userId, userId);

      return res.json(ApiResponseBuilder.success({ users: children }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/me/children:
   *   get:
   *     summary: Get current user's children
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of child users
   */
  async getMyChildren(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const children = await usersDomain.getUserChildren(req.user.userId);

      return res.json(ApiResponseBuilder.success({ users: children }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}/tree:
   *   get:
   *     summary: Get user tree
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User tree with all descendants
   */
  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const userId = req.params.id || req.user.userId;
      const tree = await usersDomain.getUserTree(req.user.userId, userId);

      return res.json(ApiResponseBuilder.success({ tree }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/me/tree:
   *   get:
   *     summary: Get current user's tree
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User tree with all descendants
   */
  async getMyTree(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const tree = await usersDomain.getUserTree(req.user.userId);

      return res.json(ApiResponseBuilder.success({ tree }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   patch:
   *     summary: Update user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, BLOCKED, PENDING]
   *     responses:
   *       200:
   *         description: User updated successfully
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const user = await usersDomain.updateUser(
        req.user.userId,
        req.params.id,
        req.body
      );

      return res.json(
        ApiResponseBuilder.success({ user, message: SUCCESS_MESSAGES.USER_UPDATED })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}/block:
   *   post:
   *     summary: Block user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User blocked successfully
   */
  async block(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const user = await usersDomain.blockUser(req.user.userId, req.params.id);

      return res.json(
        ApiResponseBuilder.success({ user, message: SUCCESS_MESSAGES.USER_BLOCKED })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}/unblock:
   *   post:
   *     summary: Unblock user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User unblocked successfully
   */
  async unblock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const user = await usersDomain.unblockUser(req.user.userId, req.params.id);

      return res.json(
        ApiResponseBuilder.success({ user, message: SUCCESS_MESSAGES.USER_UNBLOCKED })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/users/{id}/reset-password:
   *   post:
   *     summary: Reset user password
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newPassword
   *             properties:
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password reset successfully
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { newPassword } = req.body;

      await usersDomain.resetUserPassword(
        req.user.userId,
        req.params.id,
        newPassword
      );

      return res.json(
        ApiResponseBuilder.success({ message: SUCCESS_MESSAGES.PASSWORD_RESET })
      );
    } catch (error) {
      return next(error);
    }
  }
}

export const usersController = new UsersController();
