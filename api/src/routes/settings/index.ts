import { Router } from 'express';
import { settingsController } from '../../controllers/settings.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/casino', settingsController.getCasino.bind(settingsController));
router.patch('/casino', settingsController.updateCasino.bind(settingsController));

export default router;
