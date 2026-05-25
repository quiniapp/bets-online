import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { adminStatsController } from '../../controllers/admin-stats.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) => adminStatsController.getOverview(req, res, next));

export default router;
