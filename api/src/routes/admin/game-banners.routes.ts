import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { gameBannersController } from '../../controllers/game-banners.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => gameBannersController.getAll(req, res, next));
router.post('/', (req, res, next) => gameBannersController.create(req, res, next));
router.patch('/:id', (req, res, next) => gameBannersController.update(req, res, next));
router.delete('/:id', (req, res, next) => gameBannersController.delete(req, res, next));

export default router;
