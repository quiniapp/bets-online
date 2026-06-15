import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { adminStatsRepository } from './admin-stats.repository';

export class AdminStatsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminStatsRepository.getOverview(req.user!.userId);
      return res.json(ApiResponseBuilder.success(data));
    } catch (error) {
      return next(error);
    }
  }
}

export const adminStatsController = new AdminStatsController();
