import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';
import adminProvidersRoutes from './providers.routes';
import adminGameTypesRoutes from './game-types.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);
router.use('/providers', adminProvidersRoutes);
router.use('/game-types', adminGameTypesRoutes);

export default router;
