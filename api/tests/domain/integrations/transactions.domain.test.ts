import { TransactionsDomain } from '../../../src/domain/integrations/21viral/transactions.domain';
import { TransactionType, BetType, GameRoundStatus, ViralErrorCode } from 'helper';

jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: { findByProviderPlayerId: jest.fn() }
}));
jest.mock('../../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserIdWithLock: jest.fn(),
    updateChipBalance: jest.fn()
  }
}));
jest.mock('../../../src/persistence/repositories/users.repository', () => ({
  usersRepository: { findById: jest.fn() }
}));
jest.mock('../../../src/persistence/repositories/providerTransaction.repository', () => ({
  providerTransactionRepository: {
    findByIdempotencyKey: jest.fn(),
    findOriginalForReversal: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: {
    transaction: jest.fn((cb) => cb({ commit: jest.fn(), rollback: jest.fn() }))
  }
}));

import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';
import { providerTransactionRepository } from '../../../src/persistence/repositories/providerTransaction.repository';

const domain = new TransactionsDomain();

const mockProfile = {
  id: 'profile-1', userId: 'user-1', providerName: '21viral',
  providerPlayerId: '123', currency: 'ARS', countryCode: 'AR',
  isActive: true, createdAt: new Date(), updatedAt: new Date()
};
const mockUser = { id: 'user-1', status: 'ACTIVE', role: 'USER' };
const mockBalance = { id: 'bal-1', userId: 'user-1', chipBalance: 100.00, lastUpdatedAt: new Date() };
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

describe('TransactionsDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(mockBalance);
    (balancesRepository.updateChipBalance as jest.Mock).mockResolvedValue(undefined);
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue(mockCreatedTx);
  });

  it('should process Debit and return updated balance', async () => {
    const result = await domain.processTransaction(baseDebitReq);
    expect(result.balance).toBe('90.00');
    expect(result.currency).toBe('ARS');
    expect(result.operatorTransactionId).toBe('tx-1');
    expect(result.alreadyProcessed).toBeUndefined();
  });

  it('should return alreadyProcessed: true for idempotent Debit', async () => {
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue(mockCreatedTx);
    const result = await domain.processTransaction(baseDebitReq);
    expect(result.alreadyProcessed).toBe(true);
    expect(balancesRepository.updateChipBalance).not.toHaveBeenCalled();
  });

  it('should throw InsufficientFunds when balance < amount', async () => {
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({ ...mockBalance, chipBalance: 5.00 });
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.InsufficientFunds });
  });

  it('should throw PlayerNotActive when profile not found', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });

  it('should throw CurrencyMismatch when request currency differs', async () => {
    await expect(domain.processTransaction({ ...baseDebitReq, currency: 'USD' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.CurrencyMismatch });
  });

  it('should throw DoubleTransactionWithDifferentAmount for same tx, different amount', async () => {
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue({ ...mockCreatedTx, amount: '20.00' });
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.DoubleTransactionWithDifferentAmount });
  });

  it('should process Credit and add to balance', async () => {
    const creditReq = { ...baseDebitReq, transactionType: TransactionType.Credit, providerTransactionId: 'ptx-002' };
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Credit, balanceAfter: '110.00' });
    const result = await domain.processTransaction(creditReq);
    expect(result.balance).toBe('110.00');
  });

  it('should process Reversal of Debit and restore balance', async () => {
    const originalDebit = { ...mockCreatedTx, transactionType: TransactionType.Debit, amount: '10.00', balanceAfter: '90.00' };
    (providerTransactionRepository.findOriginalForReversal as jest.Mock).mockResolvedValue(originalDebit);
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({ ...mockBalance, chipBalance: 90.00 });
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Reversal, balanceAfter: '100.00' });
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal, providerTransactionId: 'ptx-001' };
    const result = await domain.processTransaction(reversalReq);
    expect(result.balance).toBe('100.00');
  });

  it('should throw GameRoundNotFound for Reversal with no original tx', async () => {
    (providerTransactionRepository.findOriginalForReversal as jest.Mock).mockResolvedValue(null);
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal };
    await expect(domain.processTransaction(reversalReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.GameRoundNotFound });
  });
});
