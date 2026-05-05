import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { providersController } from '../../controllers/providers.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => providersController.getAllForAdmin(req, res, next));
router.patch('/:name', (req, res, next) => providersController.update(req, res, next));

export default router;
