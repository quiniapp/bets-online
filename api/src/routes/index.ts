import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import chipsRoutes from './chips';

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

export default router;
