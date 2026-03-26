import { Router } from 'express';
import { balanceController } from '../../../controllers/integrations/21viral/balance.controller';

const router = Router();

router.post('/balance', balanceController.getBalance.bind(balanceController));

export default router;
