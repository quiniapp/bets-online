import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';
import adminProvidersRoutes from '../providers/providers.admin.routes';
import providerTypeOrdersAdminRoutes from '../provider-type-orders/provider-type-orders.admin.routes';
import adminGameTypesRoutes from '../game-types/game-types.admin.routes';
import featuredGamesAdminRoutes from '../featured-games/featured-games.admin.routes';
import gameBannersAdminRoutes from '../game-banners/game-banners.admin.routes';
import adminStatsRoutes from './stats.routes';
import gameImagesRoutes from '../game-images/game-images.admin.routes';
import gameAnalyticsRoutes from './game-analytics.routes';
import reportsRoutes from './reports.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);
router.use('/providers', providerTypeOrdersAdminRoutes);
router.use('/providers', adminProvidersRoutes);
router.use('/game-types', adminGameTypesRoutes);
router.use('/featured-games', featuredGamesAdminRoutes);
router.use('/banners', gameBannersAdminRoutes);
router.use('/stats/overview', adminStatsRoutes);
router.use('/games', gameImagesRoutes);
router.use('/game-analytics', gameAnalyticsRoutes);
router.use('/reports', reportsRoutes);

export default router;
