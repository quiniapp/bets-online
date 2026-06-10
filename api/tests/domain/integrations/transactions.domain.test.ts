import { transactionsDomain } from '../../../src/features/integrations/21viral/transactions.domain';
import { userProviderProfileRepository } from '../../../src/features/integrations/21viral/userProviderProfile.repository';
import { balancesRepository } from '../../../src/features/chips/balances.repository';
import { usersRepository } from '../../../src/features/users/users.repository';
import { providerTransactionRepository } from '../../../src/features/integrations/21viral/providerTransaction.repository';
import { chipMovementsRepository } from '../../../src/features/chips/chip-movements.repository';
import { sequelize } from '../../../src/config/sequelize';
import { TransactionType, BetType, GameRoundStatus, ViralErrorCode, UserRole, ChipMovementType } from 'helper';

jest.mock('../../../src/config', () => ({
  config: {
    viral: { username: 'testuser', secretKey: 'a'.repeat(32), integratorUrl: 'https://api.stg.games-viral.com/' }
  }
}));
jest.mock('../../../src/features/integrations/21viral/userProviderProfile.repository', () => ({
  userProviderProfileRepository: { findByProviderPlayerId: jest.fn() }
}));
jest.mock('../../../src/features/chips/balances.repository', () => ({
  balancesRepository: {
    findByUserIdWithLock: jest.fn(),
    updateChipBalance: jest.fn()
  }
}));
jest.mock('../../../src/features/users/users.repository', () => ({
  usersRepository: { findById: jest.fn() }
}));
jest.mock('../../../src/features/integrations/21viral/providerTransaction.repository', () => ({
  providerTransactionRepository: {
    findByIdempotencyKey: jest.fn(),
    findOriginalForReversal: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('../../../src/features/chips/chip-movements.repository', () => ({
  chipMovementsRepository: { create: jest.fn() }
}));
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: { transaction: jest.fn() }
}));

const mockProfileRepo = userProviderProfileRepository as jest.Mocked<typeof userProviderProfileRepository>;
const mockBalancesRepo = balancesRepository as jest.Mocked<typeof balancesRepository>;
const mockUsersRepo = usersRepository as jest.Mocked<typeof usersRepository>;
const mockProviderTxRepo = providerTransactionRepository as jest.Mocked<typeof providerTransactionRepository>;
const mockChipRepo = chipMovementsRepository as jest.Mocked<typeof chipMovementsRepository>;
const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;

const mockProfile = {
  id: 'profile-1', userId: 'user-1', providerName: '21viral',
  providerPlayerId: '123', currency: 'ARS', countryCode: 'AR',
  isActive: true, createdAt: new Date(), updatedAt: new Date()
};
const mockUser = { id: 'user-1', status: 'ACTIVE', role: UserRole.PLAYER };
const mockBalance = { id: 'bal-1', userId: 'user-1', chipBalance: '100.00', lastUpdatedAt: new Date() };
const mockCreatedTx = {
  id: 'tx-1', providerName: '21viral', providerTransactionId: 'ptx-001',
  transactionType: TransactionType.Debit, amount: '10.00', currency: 'ARS',
  balanceAfter: '90.00', providerPlayerId: '123', userId: 'user-1',
  providerGameRoundId: null, providerGameId: null, betType: null,
  gameRoundStatus: null, betOutcomeEventData: null, createdAt: new Date(), updatedAt: new Date()
};

const baseDebitReq = {
  transactionType: TransactionType.Debit,
  betType: BetType.Cash,
  gameRoundStatus: GameRoundStatus.Completed,
  playerId: '123',
  amount: '10.00',
  providerGameRoundId: 'round-1',
  providerTransactionId: 'ptx-001',
  timestamp: Math.floor(Date.now() / 1000)
};

function setupSequelizeTransaction() {
  mockSequelize.transaction.mockImplementation(async (fn: any) => fn({}));
}

describe('TransactionsDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(mockProfile);
    mockUsersRepo.findById.mockResolvedValue(mockUser as any);
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(mockBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockProviderTxRepo.create.mockResolvedValue(mockCreatedTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);
    setupSequelizeTransaction();
  });

  it('should process Debit and return updated balance', async () => {
    const result = await transactionsDomain.processTransaction(baseDebitReq as any);
    expect(result.balance).toBe('90.00');
    expect(result.currency).toBe('ARS');
    expect(result.operatorTransactionId).toBe('tx-1');
    expect(result.alreadyProcessed).toBeUndefined();
  });

  it('should return alreadyProcessed: true for idempotent Debit', async () => {
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(mockCreatedTx as any);
    const result = await transactionsDomain.processTransaction(baseDebitReq as any);
    expect(result.alreadyProcessed).toBe(true);
    expect(mockBalancesRepo.updateChipBalance).not.toHaveBeenCalled();
  });

  it('should throw InsufficientFunds when balance < amount', async () => {
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue({ ...mockBalance, chipBalance: '5.00' } as any);
    await expect(transactionsDomain.processTransaction(baseDebitReq as any))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.InsufficientFunds });
  });

  it('should throw PlayerNotActive when profile not found', async () => {
    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(null);
    await expect(transactionsDomain.processTransaction(baseDebitReq as any))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });

  it('should throw CurrencyMismatch when request currency differs', async () => {
    await expect(transactionsDomain.processTransaction({ ...baseDebitReq, currency: 'USD' } as any))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.CurrencyMismatch });
  });

  it('should throw DoubleTransactionWithDifferentAmount for same tx, different amount', async () => {
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue({ ...mockCreatedTx, amount: '20.00' } as any);
    await expect(transactionsDomain.processTransaction(baseDebitReq as any))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.DoubleTransactionWithDifferentAmount });
  });

  it('should process Credit and add to balance', async () => {
    const creditReq = { ...baseDebitReq, transactionType: TransactionType.Credit, providerTransactionId: 'ptx-002' };
    mockProviderTxRepo.create.mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Credit, balanceAfter: '110.00' } as any);
    const result = await transactionsDomain.processTransaction(creditReq as any);
    expect(result.balance).toBe('110.00');
  });

  it('should process Reversal of Debit and restore balance', async () => {
    const originalDebit = { ...mockCreatedTx, transactionType: TransactionType.Debit, amount: '10.00', balanceAfter: '90.00' };
    mockProviderTxRepo.findOriginalForReversal.mockResolvedValue(originalDebit as any);
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue({ ...mockBalance, chipBalance: '90.00' } as any);
    mockProviderTxRepo.create.mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Reversal, balanceAfter: '100.00' } as any);
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal, providerTransactionId: 'ptx-001' };
    const result = await transactionsDomain.processTransaction(reversalReq as any);
    expect(result.balance).toBe('100.00');
  });

  it('should throw GameRoundNotFound for Reversal with no original tx', async () => {
    mockProviderTxRepo.findOriginalForReversal.mockResolvedValue(null);
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal };
    await expect(transactionsDomain.processTransaction(reversalReq as any))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.GameRoundNotFound });
  });
});

// ─── chip_movement dual-write tests ───────────────────────────────────────────

describe('transactionsDomain.processTransaction — chip_movement dual-write', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseProfile = {
    id: 'profile-1', userId: 'user-1', providerName: '21viral',
    providerPlayerId: '100001', currency: 'ARS', countryCode: 'AR',
    isActive: true, createdAt: new Date(), updatedAt: new Date()
  };
  const baseUser = {
    id: 'user-1', username: 'player1', email: null, role: UserRole.PLAYER,
    status: 'ACTIVE' as any, createdAt: new Date(), updatedAt: new Date()
  };
  const baseBalance = { id: 'bal-1', userId: 'user-1', chipBalance: '500.00', lastUpdatedAt: new Date() };
  const baseProviderTx = {
    id: 'ptx-1', providerName: '21viral', providerTransactionId: 'txn-debit-1',
    providerGameRoundId: 'round-1', providerGameId: 'vs25wolfgold',
    providerPlayerId: '100001', userId: 'user-1',
    transactionType: TransactionType.Debit, betType: null, gameRoundStatus: null,
    amount: '10.00', currency: 'ARS', balanceAfter: '490.00',
    betOutcomeEventData: null, createdAt: new Date(), updatedAt: new Date()
  };

  const debitReq = {
    playerId: '100001', providerTransactionId: 'txn-debit-1',
    transactionType: TransactionType.Debit, amount: '10.00',
    providerGameRoundId: 'round-1', providerGameId: 'vs25wolfgold'
  };

  it('creates a GAME_BET chip_movement on Debit', async () => {
    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockSequelize.transaction.mockImplementation(async (fn: any) => fn({}));
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.create.mockResolvedValue(baseProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(debitReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_BET,
        amount: 10,
        previousBalance: 500,
        newBalance: 490
      }),
      expect.anything()
    );
  });

  it('creates a GAME_WIN chip_movement on Credit', async () => {
    const creditReq = { ...debitReq, transactionType: TransactionType.Credit, providerTransactionId: 'txn-credit-1' };
    const creditProviderTx = { ...baseProviderTx, transactionType: TransactionType.Credit, amount: '10.00', balanceAfter: '510.00', providerTransactionId: 'txn-credit-1' };

    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockSequelize.transaction.mockImplementation(async (fn: any) => fn({}));
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.create.mockResolvedValue(creditProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(creditReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_WIN,
        amount: 10,
        previousBalance: 500,
        newBalance: 510
      }),
      expect.anything()
    );
  });

  it('creates a GAME_REFUND chip_movement on Reversal', async () => {
    const reversalReq = { ...debitReq, transactionType: TransactionType.Reversal, providerTransactionId: 'txn-refund-1' };
    const reversalProviderTx = { ...baseProviderTx, transactionType: TransactionType.Reversal, balanceAfter: '510.00', providerTransactionId: 'txn-refund-1' };
    const originalDebitTx = { ...baseProviderTx, transactionType: TransactionType.Debit };

    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockSequelize.transaction.mockImplementation(async (fn: any) => fn({}));
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.findOriginalForReversal.mockResolvedValue(originalDebitTx as any);
    mockProviderTxRepo.create.mockResolvedValue(reversalProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(reversalReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_REFUND,
        amount: 10,
        previousBalance: 500,
        newBalance: 510
      }),
      expect.anything()
    );
  });
});
