import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);

export default router;
