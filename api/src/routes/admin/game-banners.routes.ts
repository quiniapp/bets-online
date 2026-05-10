import { Request, Response, NextFunction, Router } from 'express';
import { ApiResponseBuilder, UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { gameBannersController } from '../../controllers/game-banners.controller';
import { supabaseStorage } from '../../services/supabase-storage.service';
import { GameBannerModel } from '../../persistence/models/game-banner.model';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => gameBannersController.getAll(req, res, next));
router.post('/', (req, res, next) => gameBannersController.create(req, res, next));
router.patch('/:id', (req, res, next) => gameBannersController.update(req, res, next));
router.delete('/:id', (req, res, next) => gameBannersController.delete(req, res, next));

router.post(
  '/:id/image',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: bannerId } = req.params;
      if (!req.file) {
        return res
          .status(400)
          .json(ApiResponseBuilder.error('BAD_REQUEST', 'No file provided'));
      }
      const banner = await GameBannerModel.findByPk(bannerId);
      if (!banner) {
        return res
          .status(404)
          .json(ApiResponseBuilder.error('NOT_FOUND', 'Banner not found'));
      }
      const filePath = `banners/${bannerId}/${Date.now()}-${req.file.originalname}`;
      const imageUrl = await supabaseStorage.uploadFile(
        'banner-images',
        filePath,
        req.file.buffer,
        req.file.mimetype
      );
      await GameBannerModel.update({ imageUrl }, { where: { id: bannerId } });
      return res.json(ApiResponseBuilder.success({ imageUrl }));
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
