import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { userFavoriteGamesDomain } from './userFavoriteGames.domain';

export class UserFavoriteGamesController {
  async getMyFavoriteIds(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      const ids = await userFavoriteGamesDomain.getMyFavoriteIds(req.user.userId);
      return res.json(ApiResponseBuilder.success({ ids }));
    } catch (error) {
      return next(error);
    }
  }

  async getMyFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      const games = await userFavoriteGamesDomain.getMyFavorites(req.user.userId);
      return res.json(ApiResponseBuilder.success({ games }));
    } catch (error) {
      return next(error);
    }
  }

  async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      await userFavoriteGamesDomain.addFavorite(req.user.userId, req.params.gameId);
      return res.status(201).json(ApiResponseBuilder.success({ added: true }));
    } catch (error) {
      return next(error);
    }
  }

  async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
      }
      await userFavoriteGamesDomain.removeFavorite(req.user.userId, req.params.gameId);
      return res.json(ApiResponseBuilder.success({ removed: true }));
    } catch (error) {
      return next(error);
    }
  }
}

export const userFavoriteGamesController = new UserFavoriteGamesController();
