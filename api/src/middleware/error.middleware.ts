import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, ErrorCode } from 'helper';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    // Expected/handled errors (4xx business rules) are warnings; 5xx are errors
    const log = err.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log(
      { err, method: req.method, url: req.originalUrl, status: err.statusCode, code: err.code },
      'request error'
    );
    return res.status(err.statusCode).json(
      ApiResponseBuilder.error(err.code, err.message, err.details)
    );
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error');

  return res.status(500).json(
    ApiResponseBuilder.error(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? err.message : undefined
    )
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    ApiResponseBuilder.error(
      ErrorCode.NOT_FOUND,
      `Route ${req.originalUrl} not found`
    )
  );
};
