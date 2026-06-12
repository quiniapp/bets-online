import { Router } from 'express';
import authRoutes from './features/auth/auth.routes';
import usersRoutes from './features/users/users.routes';
import chipsRoutes from './features/chips/chips.routes';
import gamesRoutes from './features/games/games.routes';
import betsRoutes from './features/bets/bets.routes';
import integrationsRoutes from './features/integrations/21viral/21viral.routes';
import callbackRoutes from './features/integrations/21viral/callbacks.routes';
import adminRoutes from './features/admin/admin.routes';
import providersRoutes from './features/providers/providers.routes';
import favoritesRoutes from './features/favorites/favorites.routes';
import featuredGamesRoutes from './features/featured-games/featured-games.routes';
import bannersRoutes from './features/game-banners/game-banners.routes';
import settingsRoutes from './features/settings/settings.routes';
import lobbyRoutes from './features/lobby/lobby.routes';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/chips', chipsRoutes);
router.use('/games', gamesRoutes);
router.use('/bets', betsRoutes);
router.use('/integrations/21viral', integrationsRoutes);
router.use('/callback/21viral', callbackRoutes);
router.use('/admin', adminRoutes);
router.use('/providers', providersRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/featured-games', featuredGamesRoutes);
router.use('/banners', bannersRoutes);
router.use('/settings', settingsRoutes);
router.use('/lobby', lobbyRoutes);

export default router;
