import { Router } from 'express';
import balanceRoutes from './balance.routes';

const router = Router();

router.use('/players', balanceRoutes);

export default router;
