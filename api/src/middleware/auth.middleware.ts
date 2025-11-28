import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponseBuilder, ErrorCode, UserRole, JwtPayload } from 'helper';
import { config } from '../config';
import { AppError } from './error.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.session || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(
        401,
        ErrorCode.UNAUTHORIZED,
        'No token provided'
      );
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json(
        ApiResponseBuilder.error(
          ErrorCode.TOKEN_EXPIRED,
          'Token has expired'
        )
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json(
        ApiResponseBuilder.error(
          ErrorCode.INVALID_TOKEN,
          'Invalid token'
        )
      );
    }

    return next(error);
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(
        401,
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions'
      );
    }

    return next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.session || req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  return next();
};
