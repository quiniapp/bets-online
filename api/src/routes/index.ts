import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import chipsRoutes from './chips';
import gamesRoutes from './games';
import betsRoutes from './bets';
import integrationsRoutes from './integrations/21viral';
import adminRoutes from './admin';
import providersRoutes from './providers';
import favoritesRoutes from './favorites';
import featuredGamesRoutes from './featured-games';
import bannersRoutes from './banners';

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
router.use('/admin', adminRoutes);
router.use('/providers', providersRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/featured-games', featuredGamesRoutes);
router.use('/banners', bannersRoutes);

export default router;
