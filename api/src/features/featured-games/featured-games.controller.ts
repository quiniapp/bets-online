import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { featuredGamesDomain } from './featured-games.domain';

export class FeaturedGamesController {
  async getActive(_req: Request, res: Response, next: NextFunction) {
    try {
      const featured = await featuredGamesDomain.getActive();
      return res.json(ApiResponseBuilder.success(featured));
    } catch (error) {
      return next(error);
    }
  }

  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const featured = await featuredGamesDomain.getAll();
      return res.json(ApiResponseBuilder.success(featured));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId, sortOrder } = req.body;
      const featured = await featuredGamesDomain.create({ gameId, sortOrder });
      return res.status(201).json(ApiResponseBuilder.success(featured));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sortOrder, isActive } = req.body;
      const featured = await featuredGamesDomain.update(id, { sortOrder, isActive });
      if (!featured) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Featured game not found'));
      }
      return res.json(ApiResponseBuilder.success(featured));
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await featuredGamesDomain.delete(id);
      if (!deleted) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Featured game not found'));
      }
      return res.json(ApiResponseBuilder.success({ deleted: true }));
    } catch (error) {
      return next(error);
    }
  }
}

export const featuredGamesController = new FeaturedGamesController();
