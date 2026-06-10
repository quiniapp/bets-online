import { Router } from 'express';
import { updateCasinoSettingsSchema } from 'helper';
import { settingsController } from './settings.controller';
import { authMiddleware, optionalAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

router.get('/casino', optionalAuth, settingsController.getCasino.bind(settingsController));
router.patch('/casino', authMiddleware, validate(updateCasinoSettingsSchema), settingsController.updateCasino.bind(settingsController));

export default router;
