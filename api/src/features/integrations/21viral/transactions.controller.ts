import { Request, Response, NextFunction } from 'express';
import { providerTransactionRequestSchema, ViralErrorCode } from 'helper';
import { transactionsDomain } from './transactions.domain';
import { ViralError } from './balance.domain';

export class TransactionsController {
  async processTransaction(req: Request, res: Response, next: NextFunction) {
    console.log('[21Viral][CALLBACK][transactions] REQUEST', JSON.stringify(req.body));
    try {
      const parsed = providerTransactionRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        const errorBody = {
          viralErrorCode: ViralErrorCode.RequestValidationFailure,
          message: 'Request body validation failed'
        };
        console.log('[21Viral][CALLBACK][transactions] RESPONSE 422', JSON.stringify({ ...errorBody, issues: parsed.error.issues }));
        return res.status(422).json(errorBody);
      }

      const result = await transactionsDomain.processTransaction(parsed.data);
      console.log('[21Viral][CALLBACK][transactions] RESPONSE 200', JSON.stringify(result));
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ViralError) {
        const statusCode =
          error.viralErrorCode === ViralErrorCode.AuthenticationFailure ? 401 : 422;
        const errorBody = {
          viralErrorCode: error.viralErrorCode,
          message: error.message
        };
        console.log(`[21Viral][CALLBACK][transactions] RESPONSE ${statusCode}`, JSON.stringify(errorBody));
        return res.status(statusCode).json(errorBody);
      }
      return next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
