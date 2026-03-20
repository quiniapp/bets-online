import { Router } from 'express';
import balanceRoutes from './balance.routes';
import transactionsRoutes from './transactions.routes';

const router = Router();

router.use('/players', balanceRoutes);
router.use('/players', transactionsRoutes);

export default router;
