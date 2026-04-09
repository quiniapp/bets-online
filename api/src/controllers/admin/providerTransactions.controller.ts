import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { providerTransactionRepository } from '../../persistence/repositories/providerTransaction.repository';

export class ProviderTransactionsController {
  /**
   * @swagger
   * /api/admin/provider-transactions:
   *   get:
   *     summary: Get all provider transactions (admin)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Items per page (max 100)
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter by user ID
   *       - in: query
   *         name: providerName
   *         schema:
   *           type: string
   *         description: Filter by provider name
   *     responses:
   *       200:
   *         description: Paginated list of provider transactions
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - requires ADMIN or OWNER role
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20), 100);
      const userId = req.query.userId as string | undefined;
      const providerName = req.query.providerName as string | undefined;

      const { rows, count } = await providerTransactionRepository.findAll({
        page,
        limit,
        userId,
        providerName
      });

      return res.json(ApiResponseBuilder.paginated(rows, page, limit, count));
    } catch (error) {
      return next(error);
    }
  }
}

export const providerTransactionsController = new ProviderTransactionsController();
