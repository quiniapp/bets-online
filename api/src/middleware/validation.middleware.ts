import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ApiResponseBuilder, ErrorCode } from 'helper';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          ApiResponseBuilder.error(
            ErrorCode.VALIDATION_ERROR,
            'Validation failed',
            error.errors
          )
        );
      }
      return next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          ApiResponseBuilder.error(
            ErrorCode.VALIDATION_ERROR,
            'Query validation failed',
            error.errors
          )
        );
      }
      return next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          ApiResponseBuilder.error(
            ErrorCode.VALIDATION_ERROR,
            'Parameter validation failed',
            error.errors
          )
        );
      }
      return next(error);
    }
  };
};
