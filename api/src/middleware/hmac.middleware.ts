import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ViralErrorCode } from 'helper';

export interface HmacMiddlewareConfig {
  username: string;
  secretKey: string;
  providerName: string;
  timestampToleranceSeconds?: number;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function generateHmac(secretKey: string, canonicalBody: string): string {
  return crypto.createHmac('sha256', secretKey).update(canonicalBody, 'utf8').digest('hex');
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
    if (Math.abs(nowSeconds - timestamp) > tolerance) {
      authFailure(res, 'Request timestamp out of tolerance window');
      return;
    }

    // Validate signature hex format before timingSafeEqual (SHA256 hex = 64 hex chars = 32 bytes)
    if (!/^[0-9a-fA-F]{64}$/.test(receivedSignature)) {
      authFailure(res, 'Invalid signature format');
      return;
    }

    const expectedSignature = generateHmac(config.secretKey, canonicalize(req.body));

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
