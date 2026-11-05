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

  // Multer (multipart) errors: too large / wrong field, etc. These are client
  // errors, not server failures, so surface a 4xx instead of a generic 500.
  if (err.name === 'MulterError') {
    const code = (err as Error & { code?: string }).code;
    const status = code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
    return res.status(status).json(ApiResponseBuilder.error(ErrorCode.INVALID_INPUT, message));
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
