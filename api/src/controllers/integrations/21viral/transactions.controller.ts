import { Request, Response, NextFunction } from 'express';
import { providerTransactionRequestSchema, ViralErrorCode } from 'helper';
import { transactionsDomain } from '../../../domain/integrations/21viral/transactions.domain';
import { ViralError } from '../../../domain/integrations/21viral/balance.domain';

export class TransactionsController {
  async processTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = providerTransactionRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(422).json({
          viralErrorCode: ViralErrorCode.RequestValidationFailure,
          message: 'Request body validation failed'
        });
      }

      const result = await transactionsDomain.processTransaction(parsed.data);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ViralError) {
        const statusCode =
          error.viralErrorCode === ViralErrorCode.AuthenticationFailure ? 401 : 422;
        return res.status(statusCode).json({
          viralErrorCode: error.viralErrorCode,
          message: error.message
        });
      }
      return next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
