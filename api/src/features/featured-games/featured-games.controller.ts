import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, FeaturedGameWithGame, UserRole } from 'helper';
import { featuredGamesDomain } from './featured-games.domain';
import { setPublicCache } from '../../utils/http-cache';

// rtp is owner-only data — strip it before sending to anyone else
const hideRtp = (items: FeaturedGameWithGame[]): FeaturedGameWithGame[] =>
  items.map(f => ({ ...f, game: { ...f.game, rtp: undefined } }));

export class FeaturedGamesController {
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const featured = await featuredGamesDomain.getActive();
      setPublicCache(req, res, 60);
      return res.json(ApiResponseBuilder.success(hideRtp(featured)));
    } catch (error) {
      return next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const featured = await featuredGamesDomain.getAll();
      const isOwner = req.user?.role === UserRole.OWNER;
      return res.json(ApiResponseBuilder.success(isOwner ? featured : hideRtp(featured)));
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
