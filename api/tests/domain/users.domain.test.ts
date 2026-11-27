import { UserRole, ErrorCode } from 'helper';

jest.mock('../../src/persistence/models', () => ({}));
jest.mock('../../src/features/users/users.repository', () => ({
  usersRepository: {
    findById: jest.fn(),
    isDescendant: jest.fn(),
    updateRole: jest.fn()
  }
}));
jest.mock('../../src/features/chips/balances.repository', () => ({
  balancesRepository: {
    findByUserId: jest.fn(),
    findByUserIds: jest.fn()
  }
}));
jest.mock('../../src/features/auth/sessions.repository', () => ({
  sessionsRepository: {
    deleteByUserId: jest.fn()
  }
}));
jest.mock('../../src/persistence/cache/user.cache', () => ({
  userCache: {
    get: jest.fn(),
    set: jest.fn()
  }
}));
jest.mock('../../src/features/auth/auth.domain', () => ({
  authDomain: {
    register: jest.fn(),
    resetPassword: jest.fn()
  }
}));
jest.mock('../../src/features/chips/chips.domain', () => ({
  chipsDomain: {
    sellChips: jest.fn()
  }
}));
jest.mock('../../src/utils/audit', () => ({
  writeAudit: jest.fn()
}));
jest.mock('../../src/features/cashier-accounts/cashier-accounts.repository', () => ({
  cashierAccountsRepository: {
    createCompensationMode: jest.fn()
  }
}));

import { UsersDomain } from '../../src/features/users/users.domain';
import { usersRepository } from '../../src/features/users/users.repository';
import { sessionsRepository } from '../../src/features/auth/sessions.repository';
import { authDomain } from '../../src/features/auth/auth.domain';
import { cashierAccountsRepository } from '../../src/features/cashier-accounts/cashier-accounts.repository';

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  role: UserRole.CASHIER,
  parentUserId: 'admin-1',
  username: 'testuser',
  status: 'ACTIVE',
  ...overrides
});

describe('UsersDomain', () => {
  let domain: UsersDomain;

  beforeEach(() => {
    jest.clearAllMocks();
    domain = new UsersDomain();
  });

  describe('createUser — reglas de rol del creador', () => {
    it('un cajero NO puede crear otro cajero', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      (usersRepository.findById as jest.Mock).mockResolvedValue(cashier);

      await expect(
        domain.createUser('cashier-1', {
          role: UserRole.CASHIER,
          username: 'nuevo-cajero',
          password: 'Password1'
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS
      });
      expect(authDomain.register).not.toHaveBeenCalled();
    });

    it('un cajero NO puede crear un admin', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      (usersRepository.findById as jest.Mock).mockResolvedValue(cashier);

      await expect(
        domain.createUser('cashier-1', {
          role: UserRole.ADMIN,
          username: 'nuevo-admin',
          password: 'Password1'
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS
      });
      expect(authDomain.register).not.toHaveBeenCalled();
    });

    it('un cajero SÍ puede crear un jugador', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      (usersRepository.findById as jest.Mock).mockResolvedValue(cashier);
      (authDomain.register as jest.Mock).mockResolvedValue(
        makeUser({ id: 'player-1', role: UserRole.PLAYER, username: 'nuevo-jugador' })
      );

      const user = await domain.createUser('cashier-1', {
        role: UserRole.PLAYER,
        username: 'nuevo-jugador',
        password: 'Password1'
      });

      expect(user.role).toBe(UserRole.PLAYER);
      expect(authDomain.register).toHaveBeenCalledWith(
        'nuevo-jugador', 'Password1', UserRole.PLAYER, 'cashier-1', undefined, undefined, undefined
      );
    });

    it('un admin NO puede crear otro admin', async () => {
      const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN, parentUserId: 'owner-1' });
      (usersRepository.findById as jest.Mock).mockResolvedValue(admin);

      await expect(
        domain.createUser('admin-1', {
          role: UserRole.ADMIN,
          username: 'otro-admin',
          password: 'Password1'
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS
      });
      expect(authDomain.register).not.toHaveBeenCalled();
    });

    it('un admin SÍ puede crear un cajero', async () => {
      const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN, parentUserId: 'owner-1' });
      (usersRepository.findById as jest.Mock).mockResolvedValue(admin);
      (authDomain.register as jest.Mock).mockResolvedValue(
        makeUser({ id: 'cashier-2', role: UserRole.CASHIER, username: 'nuevo-cajero' })
      );

      const user = await domain.createUser('admin-1', {
        role: UserRole.CASHIER,
        username: 'nuevo-cajero',
        password: 'Password1'
      });

      expect(user.role).toBe(UserRole.CASHIER);
      expect(cashierAccountsRepository.createCompensationMode).not.toHaveBeenCalled();
    });
  });

  describe('createUser — comisión', () => {
    const owner = makeUser({ id: 'owner-1', role: UserRole.OWNER, parentUserId: null });

    it.each([UserRole.CASHIER])('guarda la comisión de un %s nuevo', async role => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(owner);
      (authDomain.register as jest.Mock).mockResolvedValue(makeUser({ id: 'new-1', role }));

      await domain.createUser('owner-1', {
        role,
        username: 'nuevo',
        password: 'Password1',
        commissionPercentage: 12.345
      });

      expect(cashierAccountsRepository.createCompensationMode).toHaveBeenCalledWith(
        expect.objectContaining({ cashierId: 'new-1', type: 'PERCENTAGE', percentage: 12.35 })
      );
    });

    it('rechaza comisión para un jugador, sin crear el usuario', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(owner);

      await expect(
        domain.createUser('owner-1', {
          role: UserRole.PLAYER,
          username: 'jugador',
          password: 'Password1',
          commissionPercentage: 10
        })
      ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });

      expect(authDomain.register).not.toHaveBeenCalled();
      expect(cashierAccountsRepository.createCompensationMode).not.toHaveBeenCalled();
    });

    it('rechaza comisión para un admin (compra fichas a precio diferencial)', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(owner);

      await expect(
        domain.createUser('owner-1', {
          role: UserRole.ADMIN,
          username: 'admin3',
          password: 'Password1',
          commissionPercentage: 10
        })
      ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });

      expect(authDomain.register).not.toHaveBeenCalled();
    });

    it('rechaza saldo inicial para un admin (se le venden fichas desde Finanzas)', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(owner);

      await expect(
        domain.createUser('owner-1', {
          role: UserRole.ADMIN,
          username: 'admin2',
          password: 'Password1',
          initialBalance: 1000
        })
      ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });

      expect(authDomain.register).not.toHaveBeenCalled();
    });
  });

  describe('promoteToAdmin', () => {
    it('un admin NO puede promover a un cajero (solo el owner crea admins)', async () => {
      const admin = makeUser({ id: 'admin-1', role: UserRole.ADMIN, parentUserId: 'owner-1' });
      (usersRepository.findById as jest.Mock).mockResolvedValueOnce(admin);

      await expect(domain.promoteToAdmin('admin-1', 'cashier-1')).rejects.toMatchObject({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS
      });
      expect(usersRepository.updateRole).not.toHaveBeenCalled();
    });

    it('el owner promueve a cualquier cajero sin chequear subárbol', async () => {
      const owner = makeUser({ id: 'owner-1', role: UserRole.OWNER, parentUserId: null });
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(cashier);
      (usersRepository.updateRole as jest.Mock).mockResolvedValue(
        { ...cashier, role: UserRole.ADMIN }
      );

      const user = await domain.promoteToAdmin('owner-1', 'cashier-1');

      expect(user.role).toBe(UserRole.ADMIN);
      expect(usersRepository.isDescendant).not.toHaveBeenCalled();
      // El rol viaja en el JWT: las sesiones del promovido deben cerrarse
      expect(sessionsRepository.deleteByUserId).toHaveBeenCalledWith('cashier-1');
    });

    it('un cajero NO puede promover a otro cajero', async () => {
      const cashier = makeUser({ id: 'cashier-1', role: UserRole.CASHIER });
      (usersRepository.findById as jest.Mock).mockResolvedValueOnce(cashier);

      await expect(domain.promoteToAdmin('cashier-1', 'cashier-2')).rejects.toMatchObject({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS
      });
      expect(usersRepository.updateRole).not.toHaveBeenCalled();
    });

    it('NO se puede promover a un jugador', async () => {
      const owner = makeUser({ id: 'owner-1', role: UserRole.OWNER, parentUserId: null });
      const player = makeUser({ id: 'player-1', role: UserRole.PLAYER });
      (usersRepository.findById as jest.Mock)
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(player);

      await expect(domain.promoteToAdmin('owner-1', 'player-1')).rejects.toMatchObject({
        statusCode: 400,
        code: ErrorCode.VALIDATION_ERROR
      });
      expect(usersRepository.updateRole).not.toHaveBeenCalled();
    });
  });
});
