import { Router } from 'express';
import { createHmacMiddleware } from '../../../middleware/hmac.middleware';
import { config } from '../../../config';
import balanceRoutes from './balance.routes';
import transactionsRoutes from './transactions.routes';
import gameLaunchRoutes from './gameLaunch.routes';

const router = Router();

const hmacMiddleware = createHmacMiddleware({
  username: config.viral.username,
  secretKey: config.viral.secretKey,
  providerName: '21viral'
});

router.use('/players', hmacMiddleware, balanceRoutes);
router.use('/players', hmacMiddleware, transactionsRoutes);
router.use('/', gameLaunchRoutes);

export default router;
