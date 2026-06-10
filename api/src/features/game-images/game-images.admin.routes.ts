import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { gameImagesController } from './game-images.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

// List all uploaded images for a game + active image URL
router.get('/:id/images', (req, res, next) => gameImagesController.list(req, res, next));

// Upload a new image for a game
router.post(
  '/:id/images',
  upload.single('image'),
  (req, res, next) => gameImagesController.upload(req, res, next)
);

// Reset custom logo back to default (null)
router.post('/:id/images/reset', (req, res, next) => gameImagesController.reset(req, res, next));

// Set a specific uploaded image as the active custom logo
router.post(
  '/:id/images/:imageId/select',
  (req, res, next) => gameImagesController.select(req, res, next)
);

// Delete an uploaded image
router.delete(
  '/:id/images/:imageId',
  (req, res, next) => gameImagesController.remove(req, res, next)
);

export default router;
