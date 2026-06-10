import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { providerTypeOrdersDomain } from './provider-type-orders.domain';

export class ProviderTypeOrdersController {
  /**
   * @swagger
   * /api/admin/providers/{name}/type-orders:
   *   get:
   *     summary: Effective game-type order of a provider (ruled + unruled types)
   *     tags: [Admin Providers]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: name
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Items in effective order; sortOrder null = no rule yet
   *       404:
   *         description: Provider not found
   */
  async getByProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await providerTypeOrdersDomain.getEffective(req.params.name);
      return res.json(ApiResponseBuilder.success({ items }));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/admin/providers/{name}/type-orders:
   *   put:
   *     summary: Replace the provider's game-type ordering rules (empty items clears them)
   *     tags: [Admin Providers]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: name
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     gameType: { type: string }
   *                     sortOrder: { type: integer }
   *     responses:
   *       200:
   *         description: New effective order after replacing the rules
   *       404:
   *         description: Provider not found
   */
  async replace(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await providerTypeOrdersDomain.replace(req.params.name, req.body.items);
      return res.json(ApiResponseBuilder.success({ items }));
    } catch (error) {
      return next(error);
    }
  }
}

export const providerTypeOrdersController = new ProviderTypeOrdersController();
