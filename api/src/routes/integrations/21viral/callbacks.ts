import { Router } from 'express';
import { createHmacMiddleware } from '../../../middleware/hmac.middleware';
import { config } from '../../../config';
import balanceRoutes from './balance.routes';
import transactionsRoutes from './transactions.routes';

const router = Router();

const hmacMiddleware = createHmacMiddleware({
  username: config.viral.username,
  secretKey: config.viral.secretKey,
  providerName: '21viral'
});

// 21Viral calls these endpoints server-to-server using the operator base URL
// configured in the 21Viral dashboard. They must live at the root level.
router.use('/players', hmacMiddleware, balanceRoutes);
router.use('/players', hmacMiddleware, transactionsRoutes);

export default router;
