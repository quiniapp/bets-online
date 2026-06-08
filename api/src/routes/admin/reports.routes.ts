import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { betsController } from '../../controllers/bets.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER));

// GET /api/admin/reports/bets — house-wide totals + paginated rows
router.get('/bets', betsController.getHouseReport.bind(betsController));

export default router;
