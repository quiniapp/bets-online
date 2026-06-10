import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { featuredGamesController } from './featured-games.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => featuredGamesController.getAll(req, res, next));
router.post('/', (req, res, next) => featuredGamesController.create(req, res, next));
router.patch('/:id', (req, res, next) => featuredGamesController.update(req, res, next));
router.delete('/:id', (req, res, next) => featuredGamesController.delete(req, res, next));

export default router;
