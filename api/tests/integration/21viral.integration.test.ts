import request from 'supertest';
import crypto from 'crypto';

// ─── Set viral credentials before config is parsed ───────────────────────────
// The HMAC middleware uses config.viral.username / secretKey.
// We use the same values in makeAuthHeader() so they match.
const TEST_VIRAL_USERNAME = 'test-integrator';
const TEST_VIRAL_SECRET = '961b4ec6c03ef309663ad3f840fa527e283a3ac5479b994913a721dc30a78f4d';
process.env.VIRAL_USERNAME = TEST_VIRAL_USERNAME;
process.env.VIRAL_SECRET_KEY = TEST_VIRAL_SECRET;

// ─── Mock Sequelize Model so Model.init() is a no-op ─────────────────────────
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  class MockModel {
    static init = jest.fn();
    static hasOne = jest.fn();
    static hasMany = jest.fn();
    static belongsTo = jest.fn();
    static belongsToMany = jest.fn();
    static findOne = jest.fn();
    static findAll = jest.fn();
    static findByPk = jest.fn();
    static create = jest.fn();
    static update = jest.fn();
    static destroy = jest.fn();
    static count = jest.fn();
    static sum = jest.fn();
    static upsert = jest.fn();
  }
  return {
    ...actual,
    Model: MockModel,
    Sequelize: jest.fn().mockImplementation(() => ({
      authenticate: jest.fn().mockResolvedValue(undefined),
      define: jest.fn(),
      sync: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockImplementation(cb =>
        cb ? cb({ commit: jest.fn(), rollback: jest.fn() }) : Promise.resolve()
      ),
      query: jest.fn().mockResolvedValue([])
    })),
    DataTypes: actual.DataTypes
  };
});

// ─── Mock database so startServer() completes without real DB ────────────────
// testConnection resolves successfully, so the server calls app.listen().
// Supertest handles the actual HTTP transport internally, so port binding
// is fine for test runs (Jest runs each test file in its own process).
jest.mock('../../src/config/database', () => ({
  testConnection: jest.fn().mockResolvedValue(undefined),
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(undefined),
    define: jest.fn(),
    transaction: jest.fn()
  }
}));

// ─── Mock repositories ────────────────────────────────────────────────────────
jest.mock('../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: {
    findByProviderPlayerId: jest.fn()
  }
}));

jest.mock('../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserId: jest.fn(),
    findByUserIdWithLock: jest.fn()
  }
}));

jest.mock('../../src/persistence/repositories/users.repository', () => ({
  usersRepository: {
    findById: jest.fn()
  }
}));

jest.mock('../../src/persistence/repositories/providerTransaction.repository', () => ({
  providerTransactionRepository: {
    findByIdempotencyKey: jest.fn(),
    findOriginalForReversal: jest.fn(),
    create: jest.fn()
  }
}));

// ─── Mock rate limiters to prevent MemoryStore setInterval from leaking ───────
jest.mock('../../src/middleware/rateLimiter.middleware', () => ({
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  refreshLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  viralProviderLimiter: (_req: unknown, _res: unknown, next: () => void) => next()
}));

// Suppress the expected startup error log
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

import app from '../../src/server';
import { userProviderProfileRepository } from '../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../src/persistence/repositories/users.repository';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Canonicalize per RFC 8785
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function makeAuthHeader(body: object): string {
  const sig = crypto
    .createHmac('sha256', TEST_VIRAL_SECRET)
    .update(canonicalize(body), 'utf8')
    .digest('hex');
  return `HMAC-SHA256 ${TEST_VIRAL_USERNAME}:${sig}`;
}

const now = () => Math.floor(Date.now() / 1000);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('21Viral Integration — HMAC Authentication', () => {
  it('should return 401 with AuthenticationFailure when no Authorization header', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.viralErrorCode).toBe('AuthenticationFailure');
  });

  it('should return 401 when signature is wrong', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', `HMAC-SHA256 ${TEST_VIRAL_USERNAME}:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`)
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.viralErrorCode).toBe('AuthenticationFailure');
  });

  it('should return 401 when timestamp is expired', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() - 400 };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.viralErrorCode).toBe('AuthenticationFailure');
  });
});

describe('21Viral Integration — Balance endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 422 PlayerNotActive for unknown playerId', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);

    const body = { token: 'tok', playerId: '99999', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('PlayerNotActive');
  });

  it('should return 200 with balance for a valid player', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      providerName: '21viral',
      providerPlayerId: '1',
      currency: 'ARS',
      countryCode: 'AR',
      isActive: true
    });
    (usersRepository.findById as jest.Mock).mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
    (balancesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'bal-1',
      userId: 'user-1',
      chipBalance: 250.75
    });

    const body = { token: 'tok', playerId: '1', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe('250.75');
    expect(res.body.currency).toBe('ARS');
  });
});

describe('21Viral Integration — Transactions endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 422 PlayerNotActive for unknown playerId', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);

    const body = {
      transactionType: 'Debit',
      betType: 'Cash',
      gameRoundStatus: 'Completed',
      playerId: '99999',
      amount: '1.00',
      providerGameRoundId: 'r1',
      providerTransactionId: 'tx-test-1',
      timestamp: now()
    };
    const res = await request(app)
      .post('/api/integrations/21viral/players/transactions')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('PlayerNotActive');
  });

  it('should return 422 RequestValidationFailure for invalid transactionType', async () => {
    const body = {
      transactionType: 'InvalidType',
      betType: 'Cash',
      gameRoundStatus: 'Completed',
      playerId: '1',
      amount: '1.00',
      providerGameRoundId: 'r1',
      providerTransactionId: 'tx-test-2',
      timestamp: now()
    };
    const res = await request(app)
      .post('/api/integrations/21viral/players/transactions')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('RequestValidationFailure');
  });
});
