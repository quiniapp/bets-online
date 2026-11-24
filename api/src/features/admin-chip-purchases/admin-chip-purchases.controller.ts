import { Request, Response, NextFunction } from 'express';
import { AdminChipPurchaseStatus, ApiResponseBuilder } from 'helper';
import { adminChipPurchasesDomain } from './admin-chip-purchases.domain';

const sendPdf = (res: Response, { buffer, filename }: { buffer: Buffer; filename: string }) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
};

const listFilters = (req: Request) => ({
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 20,
  adminId: typeof req.query.adminId === 'string' ? req.query.adminId : undefined,
  status: typeof req.query.status === 'string' ? (req.query.status as AdminChipPurchaseStatus) : undefined
});

export class AdminChipPurchasesController {
  async listAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await adminChipPurchasesDomain.listAdmins(req.user!.userId);
      return res.json(ApiResponseBuilder.success({ admins }));
    } catch (error) {
      return next(error);
    }
  }

  async updatePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const tiers = await adminChipPurchasesDomain.updatePricing(
        req.user!.userId,
        req.params.id,
        req.body.tiers
      );
      return res.json(ApiResponseBuilder.success({ tiers }));
    } catch (error) {
      return next(error);
    }
  }

  async resetPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const tiers = await adminChipPurchasesDomain.resetPricing(req.user!.userId, req.params.id);
      return res.json(ApiResponseBuilder.success({ tiers }));
    } catch (error) {
      return next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminChipPurchasesDomain.listPurchases(req.user!.userId, listFilters(req));
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await adminChipPurchasesDomain.createPurchase(req.user!.userId, {
        adminId: req.body.adminId,
        chips: req.body.chips,
        percentage: req.body.percentage,
        notes: req.body.notes,
        idempotencyKey: req.body.idempotencyKey
      });
      return res.status(201).json(ApiResponseBuilder.success({ purchase }));
    } catch (error) {
      return next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await adminChipPurchasesDomain.confirmPayment(req.user!.userId, req.params.id, {
        paymentReference: req.body.paymentReference
      });
      return res.json(ApiResponseBuilder.success({ purchase }));
    } catch (error) {
      return next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await adminChipPurchasesDomain.cancelPurchase(
        req.user!.userId,
        req.params.id,
        req.body.reason
      );
      return res.json(ApiResponseBuilder.success({ purchase }));
    } catch (error) {
      return next(error);
    }
  }

  async receipt(req: Request, res: Response, next: NextFunction) {
    try {
      return sendPdf(res, await adminChipPurchasesDomain.getReceipt(req.user!.userId, req.params.id));
    } catch (error) {
      return next(error);
    }
  }

  async listOwn(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status } = listFilters(req);
      const result = await adminChipPurchasesDomain.listOwnPurchases(req.user!.userId, { page, limit, status });
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  async ownReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      return sendPdf(res, await adminChipPurchasesDomain.getOwnReceipt(req.user!.userId, req.params.id));
    } catch (error) {
      return next(error);
    }
  }
}

export const adminChipPurchasesController = new AdminChipPurchasesController();
