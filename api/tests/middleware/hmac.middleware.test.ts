import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createHmacMiddleware } from '../../src/middleware/hmac.middleware';

// Helper: canonicalize JSON per RFC 8785
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function makeSignature(secret: string, body: object): string {
  const canonical = canonicalize(body);
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

const config = {
  username: 'test-user',
  secretKey: 'test-secret',
  providerName: '21viral',
  timestampToleranceSeconds: 300
};

const middleware = createHmacMiddleware(config);

function mockReqRes(body: object, authHeader?: string) {
  const req = { body, headers: { authorization: authHeader } } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('createHmacMiddleware', () => {
  const validBody = { playerId: '1', timestamp: Math.floor(Date.now() / 1000) };

  it('should call next() when signature is valid', () => {
    const sig = makeSignature(config.secretKey, validBody);
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:${sig}`);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header is missing', () => {
    const { req, res, next } = mockReqRes(validBody);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when username does not match', () => {
    const sig = makeSignature(config.secretKey, validBody);
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 wrong-user:${sig}`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when signature is invalid', () => {
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when timestamp is too old', () => {
    const oldBody = { playerId: '1', timestamp: Math.floor(Date.now() / 1000) - 400 };
    const sig = makeSignature(config.secretKey, oldBody);
    const { req, res, next } = mockReqRes(oldBody, `HMAC-SHA256 ${config.username}:${sig}`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when signature has wrong length (not 64 hex chars)', () => {
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:tooshort`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should include viralErrorCode AuthenticationFailure in error response', () => {
    const { req, res, next } = mockReqRes(validBody);
    middleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ viralErrorCode: 'AuthenticationFailure' })
    );
  });
});
