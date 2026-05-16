import { Router, Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, UserRole } from 'helper';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { gameLaunchesRepository } from '../../persistence/repositories/game-launches.repository';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER, UserRole.ADMIN));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const rawFrom = req.query.dateFrom as string | undefined;
    const rawTo = req.query.dateTo as string | undefined;
    const dateFrom = rawFrom ? new Date(rawFrom) : defaultFrom;
    const dateTo = rawTo ? new Date(rawTo) : now;

    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return res.status(400).json(ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid dateFrom or dateTo'));
    }
    if (dateFrom > dateTo) {
      return res.status(400).json(ApiResponseBuilder.error('VALIDATION_ERROR', 'dateFrom must be before dateTo'));
    }

    const analytics = await gameLaunchesRepository.getGameAnalytics(dateFrom, dateTo);
    return res.json(ApiResponseBuilder.success(analytics));
  } catch (error) {
    return next(error);
  }
});

export default router;
