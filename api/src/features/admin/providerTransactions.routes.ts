import { Router } from 'express';
import { UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { providerTransactionsController } from './providerTransactions.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.OWNER));

router.get('/', (req, res, next) =>
  providerTransactionsController.getAll(req, res, next)
);

export default router;
