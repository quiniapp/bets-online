import { UserRole, ChipMovementType, ErrorCode } from 'helper';

jest.mock('../../src/persistence/models/index', () => ({}));
jest.mock('../../src/persistence/repositories/users.repository', () => ({
  usersRepository: {
    findById: jest.fn(),
    findDescendants: jest.fn()
  }
}));
jest.mock('../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserId: jest.fn(),
    findByUserIdWithLock: jest.fn(),
    atomicIncrement: jest.fn()
  }
}));
jest.mock('../../src/persistence/repositories/chip-movements.repository', () => ({
  chipMovementsRepository: {
    findByIdempotencyKey: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('../../src/config/sequelize', () => ({
  sequelize: {
    transaction: jest.fn()
  }
}));

import { ChipsDomain } from '../../src/domain/chips/chips.domain';
import { usersRepository } from '../../src/persistence/repositories/users.repository';
import { balancesRepository } from '../../src/persistence/repositories/balances.repository';
import { chipMovementsRepository } from '../../src/persistence/repositories/chip-movements.repository';
import { sequelize } from '../../src/config/sequelize';

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn()
};

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  role: UserRole.CASHIER,
  parentUserId: 'owner-1',
  username: 'testuser',
  status: 'ACTIVE',
  ...overrides
});

const makeBalance = (chipBalance = 1000) => ({
  id: 'bal-1',
  userId: 'user-1',
  chipBalance,
  lastUpdatedAt: new Date()
});

describe('ChipsDomain', () => {
  let domain: ChipsDomain;

  beforeEach(() => {
    jest.clearAllMocks();
    domain = new ChipsDomain();
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
    (chipMovementsRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
  });

  describe('sellChips', () => {
    it('debería descontar del cajero al vender chips al player', async () => {
      const seller = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });
      const playerBalance = makeBalance(500);
      const sellerBalance = makeBalance(1000);

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(seller)
        .mockResolvedValueOnce(player);
      (balancesRepository.findByUserIdWithLock as jest.Mock)
        .mockResolvedValueOnce(playerBalance)
        .mockResolvedValueOnce(sellerBalance);
      (chipMovementsRepository.create as jest.Mock).mockResolvedValue({
        id: 'mov-1',
        type: ChipMovementType.SELL_TO_PLAYER,
        amount: 200,
        newBalance: 700
      });
      (balancesRepository.atomicIncrement as jest.Mock).mockResolvedValue(undefined);

      await domain.sellChips('cashier-1', 'player-1', 200);

      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('player-1', 200, mockTransaction);
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', -200, mockTransaction);
    });

    it('debería lanzar INSUFFICIENT_BALANCE si el cajero no tiene saldo suficiente', async () => {
      const seller = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(seller)
        .mockResolvedValueOnce(player);
      (balancesRepository.findByUserIdWithLock as jest.Mock)
        .mockResolvedValueOnce(makeBalance(500))
        .mockResolvedValueOnce(makeBalance(100));

      await expect(domain.sellChips('cashier-1', 'player-1', 200)).rejects.toMatchObject({
        statusCode: 400,
        code: ErrorCode.INSUFFICIENT_BALANCE
      });
    });

    it('Owner vende chips sin descontar su balance', async () => {
      const owner = makeUser({ id: 'owner-1', role: UserRole.OWNER, parentUserId: null });
      const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN, parentUserId: 'owner-1' });
      const adminBalance = makeBalance(0);

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(admin);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(adminBalance);
      (chipMovementsRepository.create as jest.Mock).mockResolvedValue({
        id: 'mov-1',
        type: ChipMovementType.SELL_TO_PLAYER,
        amount: 500,
        newBalance: 500
      });
      (balancesRepository.atomicIncrement as jest.Mock).mockResolvedValue(undefined);

      await domain.sellChips('owner-1', 'admin-1', 500);

      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('admin-1', 500, mockTransaction);
      expect(balancesRepository.atomicIncrement).not.toHaveBeenCalledWith('owner-1', expect.any(Number), mockTransaction);
    });
  });

  describe('payPrize', () => {
    it('debería descontar del player y acreditar al cajero', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });
      const playerBalance = makeBalance(1000);

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(cashier)
        .mockResolvedValueOnce(player);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(playerBalance);
      (chipMovementsRepository.create as jest.Mock).mockResolvedValue({
        id: 'mov-1',
        type: ChipMovementType.PRIZE,
        amount: -300,
        newBalance: 700
      });
      (balancesRepository.atomicIncrement as jest.Mock).mockResolvedValue(undefined);

      await domain.payPrize('cashier-1', 'player-1', 300);

      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('player-1', -300, mockTransaction);
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', 300, mockTransaction);
    });

    it('debería lanzar INSUFFICIENT_BALANCE si el player no tiene saldo', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(cashier)
        .mockResolvedValueOnce(player);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(makeBalance(50));

      await expect(domain.payPrize('cashier-1', 'player-1', 300)).rejects.toMatchObject({
        statusCode: 400,
        code: ErrorCode.INSUFFICIENT_BALANCE
      });
    });
  });

  describe('registerLoss', () => {
    it('debería descontar del player y acreditar al cajero', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(cashier)
        .mockResolvedValueOnce(player);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(makeBalance(500));
      (chipMovementsRepository.create as jest.Mock).mockResolvedValue({
        id: 'mov-1', type: ChipMovementType.LOSS, amount: -200, newBalance: 300
      });
      (balancesRepository.atomicIncrement as jest.Mock).mockResolvedValue(undefined);

      await domain.registerLoss('cashier-1', 'player-1', 200);

      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('player-1', -200, mockTransaction);
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', 200, mockTransaction);
    });
  });

  describe('withdraw', () => {
    it('cajero retira chips del player → cashier acreditado', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER, parentUserId: 'cashier-1' });

      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(cashier)
        .mockResolvedValueOnce(player)
        .mockResolvedValueOnce(cashier);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(makeBalance(400));
      (chipMovementsRepository.create as jest.Mock).mockResolvedValue({
        id: 'mov-1', type: ChipMovementType.WITHDRAWAL, amount: -100, newBalance: 300
      });
      (balancesRepository.atomicIncrement as jest.Mock).mockResolvedValue(undefined);

      await domain.withdraw('cashier-1', 'player-1', 100);

      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('player-1', -100, mockTransaction);
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', 100, mockTransaction);
    });
  });
});
