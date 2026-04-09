import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { providerTransactionRepository } from '../../persistence/repositories/providerTransaction.repository';

export class ProviderTransactionsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
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
