import { Request, Response, NextFunction } from 'express';
import {
  ApiResponseBuilder,
  CompensationType,
  SUCCESS_MESSAGES,
  SettlementStatus
} from 'helper';
import { cashierAccountsDomain } from './cashier-accounts.domain';

export class CashierAccountsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const result = await cashierAccountsDomain.listAccounts(req.user!.userId, {
        page,
        limit,
        search
      });

      return res.json(
        ApiResponseBuilder.success(
          { accounts: result.accounts, summary: result.summary },
          {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit)
          }
        )
      );
    } catch (error) {
      return next(error);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierAccountsDomain.getAccount(
        req.user!.userId,
        req.params.id
      );
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async updateCompensation(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = await cashierAccountsDomain.updateCompensation(
        req.user!.userId,
        req.params.id,
        {
          type: req.body.type as CompensationType,
          percentage: req.body.percentage
        }
      );

      return res.json(
        ApiResponseBuilder.success({
          compensation: mode,
          message: SUCCESS_MESSAGES.COMPENSATION_UPDATED
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async previewSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const periodStart = req.query.periodStart as unknown as Date;
      const periodEnd = req.query.periodEnd as unknown as Date;

      const preview = await cashierAccountsDomain.previewSettlement(
        req.user!.userId,
        req.params.id,
        periodStart,
        periodEnd
      );

      return res.json(ApiResponseBuilder.success(preview));
    } catch (error) {
      return next(error);
    }
  }

  async createSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await cashierAccountsDomain.createSettlement(
        req.user!.userId,
        req.params.id,
        {
          periodStart: req.body.periodStart,
          periodEnd: req.body.periodEnd,
          notes: req.body.notes
        }
      );

      return res.json(
        ApiResponseBuilder.success({
          settlement,
          message: SUCCESS_MESSAGES.SETTLEMENT_CREATED
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async listSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const status = req.query.status as SettlementStatus | undefined;
      const cashierId = typeof req.query.cashierId === 'string' ? req.query.cashierId : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const result = await cashierAccountsDomain.listSettlements(req.user!.userId, {
        page,
        limit,
        status,
        cashierId,
        search
      });

      return res.json(
        ApiResponseBuilder.paginated(
          result.settlements,
          result.page,
          result.limit,
          result.total
        )
      );
    } catch (error) {
      return next(error);
    }
  }

  async paySettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await cashierAccountsDomain.paySettlement(
        req.user!.userId,
        req.params.id,
        {
          paymentReference: req.body.paymentReference,
          notes: req.body.notes
        }
      );

      return res.json(
        ApiResponseBuilder.success({
          settlement,
          message: SUCCESS_MESSAGES.SETTLEMENT_PAID
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async cancelSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await cashierAccountsDomain.cancelSettlement(
        req.user!.userId,
        req.params.id,
        req.body.reason
      );

      return res.json(
        ApiResponseBuilder.success({
          settlement,
          message: SUCCESS_MESSAGES.SETTLEMENT_CANCELED
        })
      );
    } catch (error) {
      return next(error);
    }
  }
}

export const cashierAccountsController = new CashierAccountsController();
