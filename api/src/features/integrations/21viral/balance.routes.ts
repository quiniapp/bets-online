import { Router } from 'express';
import { balanceController } from './balance.controller';

const router = Router();

router.post('/balance', balanceController.getBalance.bind(balanceController));

export default router;
