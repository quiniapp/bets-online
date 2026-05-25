import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';
import adminProvidersRoutes from './providers.routes';
import adminGameTypesRoutes from './game-types.routes';
import featuredGamesAdminRoutes from './featured-games.routes';
import gameBannersAdminRoutes from './game-banners.routes';
import adminStatsRoutes from './stats.routes';
import gameImagesRoutes from './game-images.routes';
import gameAnalyticsRoutes from './game-analytics.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);
router.use('/providers', adminProvidersRoutes);
router.use('/game-types', adminGameTypesRoutes);
router.use('/featured-games', featuredGamesAdminRoutes);
router.use('/banners', gameBannersAdminRoutes);
router.use('/stats/overview', adminStatsRoutes);
router.use('/games', gameImagesRoutes);
router.use('/game-analytics', gameAnalyticsRoutes);

export default router;
