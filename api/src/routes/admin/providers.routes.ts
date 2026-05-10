import { Request, Response, NextFunction, Router } from 'express';
import { ApiResponseBuilder, UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { providersController } from '../../controllers/providers.controller';
import { supabaseStorage } from '../../services/supabase-storage.service';
import { ProviderModel } from '../../persistence/models/provider.model';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => providersController.getAllForAdmin(req, res, next));
router.patch('/:name', (req, res, next) => providersController.update(req, res, next));

router.post(
  '/:name/logo',
  upload.single('logo'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      if (!req.file) {
        return res
          .status(400)
          .json(ApiResponseBuilder.error('BAD_REQUEST', 'No file provided'));
      }
      const provider = await ProviderModel.findOne({ where: { name } });
      if (!provider) {
        return res
          .status(404)
          .json(ApiResponseBuilder.error('NOT_FOUND', 'Provider not found'));
      }
      const filePath = `providers/${name}/${Date.now()}-${req.file.originalname}`;
      const logoUrl = await supabaseStorage.uploadFile(
        'provider-logos',
        filePath,
        req.file.buffer,
        req.file.mimetype
      );
      await provider.update({ logoUrl });
      return res.json(ApiResponseBuilder.success({ logoUrl }));
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
