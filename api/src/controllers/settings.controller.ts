import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { settingsDomain } from '../domain/settings/settings.domain';

export class SettingsController {
  async getCasino(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsDomain.getCasinoSettings(req.user?.userId);
      return res.json(ApiResponseBuilder.success(settings));
    } catch (error) {
      return next(error);
    }
  }

  async updateCasino(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      const settings = await settingsDomain.updateCasinoSettings(req.user.userId, req.body);
      return res.json(ApiResponseBuilder.success(settings));
    } catch (error) {
      return next(error);
    }
  }
}

export const settingsController = new SettingsController();
