import { Router } from 'express';
import { settingsController } from '../../controllers/settings.controller';
import { authMiddleware, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/casino', optionalAuth, settingsController.getCasino.bind(settingsController));
router.patch('/casino', authMiddleware, settingsController.updateCasino.bind(settingsController));

export default router;
