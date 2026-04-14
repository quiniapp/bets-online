import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ViralErrorCode } from 'helper';
import { canonicalize } from '../utils/hmac.utils';

export interface HmacMiddlewareConfig {
  username: string;
  secretKey: string;
  providerName: string;
  timestampToleranceSeconds?: number;
}


function authFailure(res: Response, message: string) {
  return res.status(401).json({
    viralErrorCode: ViralErrorCode.AuthenticationFailure,
    message
  });
}

export const createHmacMiddleware = (config: HmacMiddlewareConfig) => {
  const tolerance = config.timestampToleranceSeconds ?? 300;

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('HMAC-SHA256 ')) {
      authFailure(res, 'Missing or malformed Authorization header');
      return;
    }

    const [, credentials] = authHeader.split(' ');
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) {
      authFailure(res, 'Malformed Authorization header');
      return;
    }

    const username = credentials.substring(0, colonIndex);
    const receivedSignature = credentials.substring(colonIndex + 1);

    if (username !== config.username) {
      authFailure(res, 'Invalid authentication username');
      return;
    }

    // Validate timestamp within tolerance
    const timestamp = req.body?.timestamp;
    if (typeof timestamp !== 'number') {
      authFailure(res, 'Missing or invalid timestamp');
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    // Some providers (e.g. Pascal) send timestamp in milliseconds instead of seconds.
    // Timestamps > 1e12 are in milliseconds (year ~2001+ in ms vs ~33000+ in seconds).
    const timestampSeconds = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
    if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
      authFailure(res, 'Request timestamp out of tolerance window');
      return;
    }

    // Validate signature hex format before timingSafeEqual (SHA256 hex = 64 hex chars = 32 bytes)
    if (!/^[0-9a-fA-F]{64}$/.test(receivedSignature)) {
      authFailure(res, 'Invalid signature format');
      return;
    }

    const canonicalBody = canonicalize(req.body);
    const expectedSignature = crypto.createHmac('sha256', config.secretKey).update(canonicalBody, 'utf8').digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      authFailure(res, 'Invalid HMAC signature');
      return;
    }

    next();
  };
};
