import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponseBuilder, ErrorCode, UserRole, JwtPayload, SESSION_IDLE_MS } from 'helper';
import { config } from '../config';
import { AppError } from './error.middleware';
import { userCache } from '../persistence/cache/user.cache';
import { setSessionCookie, clearSessionCookie } from '../utils/auth-cookies';
import { sessionsRepository } from '../features/auth/sessions.repository';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload & { exp?: number };
    req.user = decoded;

    // Sliding window (real): once the access token is past half its lifetime,
    // re-issue a fresh session cookie on this response. An actively-using user
    // therefore never hits expiry, with no dependency on client refresh timing
    // and no DB write (the access token is stateless).
    if (decoded.exp) {
      const lifetimeSec = config.jwt.accessTokenMaxAge / 1000;
      const remainingSec = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingSec < lifetimeSec / 2) {
        const fresh = jwt.sign(
          { userId: decoded.userId, role: decoded.role, sessionId: decoded.sessionId },
          config.jwt.secret as jwt.Secret,
          { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
        );
        setSessionCookie(res, fresh);
        // Slide the server-side inactivity window too (fire-and-forget: one
        // indexed UPDATE at most every half token-lifetime per session).
        sessionsRepository
          .slideByToken(token, fresh, new Date(Date.now() + SESSION_IDLE_MS))
          .catch(() => { /* sliding must never break the request */ });
      }
    }

    // Renew the user cache TTL (cheap Map op, no DB).
    const cachedUser = userCache.get(decoded.userId);
    if (cachedUser) {
      userCache.set(cachedUser);
    }

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
      // Token malformado o con firma inválida: irrecuperable. Revocar la
      // cookie para que el browser no la siga presentando (el frontend
      // chequea su existencia para acceder a rutas protegidas). Un token
      // meramente EXPIRADO no entra acá: se recupera vía /auth/refresh.
      clearSessionCookie(res);
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
  } catch (_error) {
    // Ignore errors for optional auth
  }

  return next();
};
