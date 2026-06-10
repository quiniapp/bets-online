import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { gameTypesDomain } from './game-types.domain';

export class GameTypesController {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const types = await gameTypesDomain.getAll();
      return res.json(ApiResponseBuilder.success(types));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const { displayName, sortOrder } = req.body;
      const gameType = await gameTypesDomain.update(name, { displayName, sortOrder });
      if (!gameType) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Game type not found'));
      }
      return res.json(ApiResponseBuilder.success(gameType));
    } catch (error) {
      return next(error);
    }
  }
}

export const gameTypesController = new GameTypesController();
