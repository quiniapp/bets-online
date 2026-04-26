import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';
import adminProvidersRoutes from './providers.routes';
import adminGameTypesRoutes from './game-types.routes';
import featuredGamesAdminRoutes from './featured-games.routes';
import gameBannersAdminRoutes from './game-banners.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);
router.use('/providers', adminProvidersRoutes);
router.use('/game-types', adminGameTypesRoutes);
router.use('/featured-games', featuredGamesAdminRoutes);
router.use('/banners', gameBannersAdminRoutes);

export default router;
