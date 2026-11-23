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
      const preview = await cashierAccountsDomain.previewSettlement(
        req.user!.userId,
        req.params.id,
        req.query.periodEnd as string
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
          collected: req.body.collected,
          chipsLeft: req.body.chipsLeft,
          paymentReference: req.body.paymentReference,
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

  async settlementReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await cashierAccountsDomain.getSettlementReceipt(
        req.user!.userId,
        req.params.id
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      return next(error);
    }
  }

  async getPeriodAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierAccountsDomain.getPeriodAccounts(
        req.user!.userId,
        req.query.periodEnd as string
      );
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async periodSummaryReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await cashierAccountsDomain.getPeriodSummaryReceipt(
        req.user!.userId,
        req.query.periodEnd as string
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      return next(error);
    }
  }

  async ownerAccountReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await cashierAccountsDomain.getOwnerAccountReceipt(
        req.user!.userId,
        req.query.periodStart as string,
        req.query.periodEnd as string
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      return next(error);
    }
  }

  async ownerAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierAccountsDomain.getOwnerAccount(
        req.user!.userId,
        req.query.periodStart as string,
        req.query.periodEnd as string
      );
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async confirmSettlementCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const settlement = await cashierAccountsDomain.confirmSettlementCollection(
        req.user!.userId,
        req.params.id,
        {
          amount: req.body.amount,
          paymentReference: req.body.paymentReference
        }
      );

      return res.json(
        ApiResponseBuilder.success({
          settlement,
          message: SUCCESS_MESSAGES.SETTLEMENT_COLLECTED
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async listOnAccountCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const collections = await cashierAccountsDomain.listOnAccountCollections(
        req.user!.userId,
        req.params.id
      );
      return res.json(ApiResponseBuilder.success({ collections }));
    } catch (error) {
      return next(error);
    }
  }

  async createOnAccountCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const collection = await cashierAccountsDomain.createOnAccountCollection(
        req.user!.userId,
        req.params.id,
        {
          amount: req.body.amount,
          paymentReference: req.body.paymentReference,
          notes: req.body.notes
        }
      );
      return res.status(201).json(ApiResponseBuilder.success({ collection }));
    } catch (error) {
      return next(error);
    }
  }

  async cancelOnAccountCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const collection = await cashierAccountsDomain.cancelOnAccountCollection(
        req.user!.userId,
        req.params.id
      );
      return res.json(ApiResponseBuilder.success({ collection }));
    } catch (error) {
      return next(error);
    }
  }

  async listOwnSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashierAccountsDomain.listOwnSettlements(req.user!.userId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20
      });
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async ownSettlementReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await cashierAccountsDomain.getOwnSettlementReceipt(
        req.user!.userId,
        req.params.id
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
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
