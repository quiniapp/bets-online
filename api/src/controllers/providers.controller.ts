import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { providersDomain } from '../domain/providers/providers.domain';

export class ProvidersController {
  /**
   * @swagger
   * /api/providers:
   *   get:
   *     summary: Get all providers
   *     tags: [Providers]
   *     responses:
   *       200:
   *         description: List of providers
   */
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const providers = await providersDomain.getAll();
      return res.json(ApiResponseBuilder.success(providers));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const { displayName, isActive, logoUrl, sortOrder } = req.body;
      const provider = await providersDomain.update(name, { displayName, isActive, logoUrl, sortOrder });
      if (!provider) {
        return res.status(404).json(ApiResponseBuilder.error('NOT_FOUND', 'Provider not found'));
      }
      return res.json(ApiResponseBuilder.success(provider));
    } catch (error) {
      return next(error);
    }
  }
}

export const providersController = new ProvidersController();
