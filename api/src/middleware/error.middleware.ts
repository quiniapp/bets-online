import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, ErrorCode } from 'helper';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      ApiResponseBuilder.error(err.code, err.message, err.details)
    );
  }

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
