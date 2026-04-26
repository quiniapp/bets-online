import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { gameTypesController } from '../../controllers/game-types.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.patch('/:name', (req, res, next) => gameTypesController.update(req, res, next));

export default router;
