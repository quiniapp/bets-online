import { Router } from 'express';
import balanceRoutes from './balance.routes';
import transactionsRoutes from './transactions.routes';
import gameLaunchRoutes from './gameLaunch.routes';

const router = Router();

router.use('/players', balanceRoutes);
router.use('/players', transactionsRoutes);
router.use('/', gameLaunchRoutes);

export default router;
