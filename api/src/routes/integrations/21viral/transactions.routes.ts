import { Router } from 'express';
import { transactionsController } from '../../../controllers/integrations/21viral/transactions.controller';

const router = Router();

router.post(
  '/transactions',
  transactionsController.processTransaction.bind(transactionsController)
);

export default router;
