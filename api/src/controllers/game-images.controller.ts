import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { GameModel } from '../persistence/models/game.model';
import { gameImagesRepository } from '../persistence/repositories/game-images.repository';
import { supabaseStorage } from '../services/supabase-storage.service';

const BUCKET = 'game-images';

export class GameImagesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId } = req.params;
      const [images, game] = await Promise.all([
        gameImagesRepository.findByGameId(gameId),
        GameModel.findByPk(gameId)
      ]);
      if (!game) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Game not found'));
      }
      const plain = game.get({ plain: true });
      return res.json(
        ApiResponseBuilder.success({
          images,
          activeImageUrl: plain.customLogo ?? null
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId } = req.params;
      if (!req.file) {
        return res.status(400).json(ApiResponseBuilder.error('BAD_REQUEST', 'No file provided'));
      }
      const game = await GameModel.findByPk(gameId);
      if (!game) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Game not found'));
      }
      const filePath = `games/${gameId}/${Date.now()}-${req.file.originalname}`;
      const url = await supabaseStorage.uploadFile(
        BUCKET,
        filePath,
        req.file.buffer,
        req.file.mimetype
      );
      const image = await gameImagesRepository.create({
        gameId,
        url,
        label: typeof req.body.label === 'string' ? req.body.label : undefined
      });
      return res.status(201).json(ApiResponseBuilder.success(image));
    } catch (error) {
      return next(error);
    }
  }

  async select(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId, imageId } = req.params;
      const image = await gameImagesRepository.findById(imageId);
      if (!image || image.gameId !== gameId) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Image not found'));
      }
      await GameModel.update({ customLogo: image.url }, { where: { id: gameId } });
      return res.json(ApiResponseBuilder.success({ selected: true, activeImageUrl: image.url }));
    } catch (error) {
      return next(error);
    }
  }

  async reset(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId } = req.params;
      const game = await GameModel.findByPk(gameId);
      if (!game) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Game not found'));
      }
      await GameModel.update({ customLogo: null }, { where: { id: gameId } });
      return res.json(ApiResponseBuilder.success({ reset: true }));
    } catch (error) {
      return next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: gameId, imageId } = req.params;
      const image = await gameImagesRepository.findById(imageId);
      if (!image || image.gameId !== gameId) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Image not found'));
      }

      // Extract storage path from the public URL
      // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      const urlObj = new URL(image.url);
      const prefix = `/storage/v1/object/public/${BUCKET}/`;
      const storagePath = urlObj.pathname.startsWith(prefix)
        ? urlObj.pathname.slice(prefix.length)
        : urlObj.pathname;

      await supabaseStorage.deleteFile(BUCKET, storagePath);
      await gameImagesRepository.delete(imageId);

      // If the deleted image was the active custom logo, reset it
      const game = await GameModel.findByPk(gameId);
      if (game) {
        const plain = game.get({ plain: true });
        if (plain.customLogo === image.url) {
          await GameModel.update({ customLogo: null }, { where: { id: gameId } });
        }
      }

      return res.json(ApiResponseBuilder.success({ deleted: true }));
    } catch (error) {
      return next(error);
    }
  }
}

export const gameImagesController = new GameImagesController();
