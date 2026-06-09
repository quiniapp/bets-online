import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { gameBannersDomain } from '../domain/game-banners/game-banners.domain';

export class GameBannersController {
  async getActive(_req: Request, res: Response, next: NextFunction) {
    try {
      const banners = await gameBannersDomain.getActive();
      return res.json(ApiResponseBuilder.success(banners));
    } catch (error) {
      return next(error);
    }
  }

  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const banners = await gameBannersDomain.getAll();
      return res.json(ApiResponseBuilder.success(banners));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json(ApiResponseBuilder.error('BAD_REQUEST', 'No file provided'));
      }
      const sortOrder =
        req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined;
      const banner = await gameBannersDomain.createWithImage(
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype
        },
        sortOrder
      );
      return res.status(201).json(ApiResponseBuilder.success(banner));
    } catch (error) {
      return next(error);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json(ApiResponseBuilder.error('BAD_REQUEST', 'No file provided'));
      }
      const { id } = req.params;
      const banner = await gameBannersDomain.replaceImage(id, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      });
      if (!banner) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Banner not found'));
      }
      return res.json(ApiResponseBuilder.success({ imageUrl: banner.imageUrl }));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sortOrder, isActive } = req.body;
      const banner = await gameBannersDomain.update(id, { sortOrder, isActive });
      if (!banner) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Banner not found'));
      }
      return res.json(ApiResponseBuilder.success(banner));
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await gameBannersDomain.delete(id);
      if (!deleted) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Banner not found'));
      }
      return res.json(ApiResponseBuilder.success({ deleted: true }));
    } catch (error) {
      return next(error);
    }
  }
}

export const gameBannersController = new GameBannersController();
