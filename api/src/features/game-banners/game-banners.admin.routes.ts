import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { gameBannersController } from './game-banners.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => gameBannersController.getAll(req, res, next));
router.post('/', upload.single('image'), (req, res, next) =>
  gameBannersController.create(req, res, next)
);
router.patch('/:id', (req, res, next) => gameBannersController.update(req, res, next));
router.delete('/:id', (req, res, next) => gameBannersController.delete(req, res, next));
router.post('/:id/image', upload.single('image'), (req, res, next) =>
  gameBannersController.uploadImage(req, res, next)
);

export default router;
