import {
  CompensationType,
  ErrorCode,
  SettlementStatus,
  UserRole
} from 'helper';

jest.mock('../../src/persistence/models', () => ({}));
jest.mock('../../src/features/users/users.repository', () => ({
  usersRepository: {
    findById: jest.fn(),
    findDescendants: jest.fn(),
    isDescendant: jest.fn()
  }
}));
jest.mock('../../src/features/chips/balances.repository', () => ({
  balancesRepository: {
    findByUserIds: jest.fn()
  }
}));
jest.mock('../../src/features/cashier-accounts/cashier-accounts.repository', () => ({
  cashierAccountsRepository: {
    findCompensationModes: jest.fn(),
    findCompensationModeForPeriod: jest.fn(),
    closeActiveCompensationModes: jest.fn(),
    createCompensationMode: jest.fn(),
    findNonCanceledSettlements: jest.fn(),
    findSettlementsForCashier: jest.fn(),
    findRecentAccountMovements: jest.fn(),
    getMovementTotals: jest.fn(),
    getMovementTotalsForPeriod: jest.fn(),
    findOverlappingSettlement: jest.fn(),
    createSettlement: jest.fn(),
    findSettlementById: jest.fn(),
    markSettlementPaid: jest.fn(),
    markSettlementCanceled: jest.fn(),
    findSettlements: jest.fn()
  }
}));

import { CashierAccountsDomain } from '../../src/features/cashier-accounts/cashier-accounts.domain';
import { usersRepository } from '../../src/features/users/users.repository';
import { balancesRepository } from '../../src/features/chips/balances.repository';
import { cashierAccountsRepository } from '../../src/features/cashier-accounts/cashier-accounts.repository';

const owner = {
  id: 'owner-1',
  role: UserRole.OWNER,
  username: 'owner',
  parentUserId: null,
  email: null,
  firstName: null,
  lastName: null,
  status: 'ACTIVE',
  lastConnection: null,
  lastActivity: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

const cashier = {
  id: 'cashier-1',
  role: UserRole.CASHIER,
  username: 'cajero1',
  parentUserId: 'owner-1',
  email: 'cajero@example.com',
  firstName: 'Cajero',
  lastName: 'Uno',
  status: 'ACTIVE',
  lastConnection: null,
  lastActivity: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

const makeSettlement = (overrides: Record<string, unknown> = {}) => ({
  id: 'settlement-1',
  cashierId: 'cashier-1',
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-01-07'),
  totalSales: 400,
  totalPrizesPaid: 150,
  profit: 250,
  payableAmount: 50,
  status: SettlementStatus.PENDING,
  compensationType: CompensationType.PERCENTAGE,
  percentage: 20,
  notes: null,
  createdBy: 'owner-1',
  paidBy: null,
  paymentReference: null,
  createdAt: new Date('2026-01-08'),
  paidAt: null,
  ...overrides
});

describe('CashierAccountsDomain', () => {
  let domain: CashierAccountsDomain;

  beforeEach(() => {
    jest.clearAllMocks();
    domain = new CashierAccountsDomain();

    (usersRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? owner : cashier)
    );
    (usersRepository.findDescendants as jest.Mock).mockResolvedValue([cashier]);
    (usersRepository.isDescendant as jest.Mock).mockResolvedValue(true);
    (balancesRepository.findByUserIds as jest.Mock).mockResolvedValue([
      { userId: 'cashier-1', chipBalance: 125 }
    ]);
  });

  it('calcula la cuenta corriente combinando totales y liquidaciones', async () => {
    (cashierAccountsRepository.findCompensationModes as jest.Mock).mockResolvedValue([
      {
        id: 'mode-1',
        cashierId: 'cashier-1',
        type: CompensationType.PERCENTAGE,
        percentage: 20,
        activeFrom: new Date('2025-01-01'),
        activeTo: null,
        createdAt: new Date('2025-01-01')
      }
    ]);
    (cashierAccountsRepository.findNonCanceledSettlements as jest.Mock).mockResolvedValue([
      makeSettlement({ id: 'pending', payableAmount: 50, totalSales: 400, totalPrizesPaid: 150 }),
      makeSettlement({
        id: 'paid',
        payableAmount: 40,
        totalSales: 300,
        totalPrizesPaid: 100,
        status: SettlementStatus.PAID,
        paidAt: new Date('2026-01-09')
      })
    ]);
    (cashierAccountsRepository.getMovementTotals as jest.Mock).mockResolvedValue(
      new Map([['cashier-1', { totalSales: 1000, totalPrizes: 400 }]])
    );

    const result = await domain.listAccounts('owner-1');

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      cashierId: 'cashier-1',
      chipBalance: 125,
      totalSales: 1000,
      totalPrizes: 400,
      profit: 600,
      pendingAmount: 50,
      paidAmount: 40,
      openProfit: 150,
      openCommission: 30,
      balanceDue: 80
    });
    expect(result.summary).toMatchObject({
      totalCashiers: 1,
      totalSales: 1000,
      totalPrizes: 400,
      totalProfit: 600,
      pendingAmount: 50,
      paidAmount: 40,
      openCommission: 30,
      balanceDue: 80
    });
  });

  it('crea una liquidación con el snapshot de la comisión del período', async () => {
    const periodStart = new Date('2026-02-01T00:00:00.000Z');
    const periodEnd = new Date('2026-02-07T23:59:59.999Z');

    (cashierAccountsRepository.findCompensationModeForPeriod as jest.Mock).mockResolvedValue({
      id: 'mode-2',
      cashierId: 'cashier-1',
      type: CompensationType.PERCENTAGE,
      percentage: 25,
      activeFrom: new Date('2026-01-01'),
      activeTo: null,
      createdAt: new Date('2026-01-01')
    });
    (cashierAccountsRepository.getMovementTotalsForPeriod as jest.Mock).mockResolvedValue({
      totalSales: 800,
      totalPrizes: 300
    });
    (cashierAccountsRepository.findOverlappingSettlement as jest.Mock).mockResolvedValue(null);
    (cashierAccountsRepository.createSettlement as jest.Mock).mockResolvedValue(
      makeSettlement({
        id: 'new-settlement',
        periodStart,
        periodEnd,
        totalSales: 800,
        totalPrizesPaid: 300,
        profit: 500,
        payableAmount: 125,
        percentage: 25
      })
    );

    const created = await domain.createSettlement('owner-1', 'cashier-1', {
      periodStart,
      periodEnd
    });

    expect(cashierAccountsRepository.createSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        cashierId: 'cashier-1',
        totalSales: 800,
        totalPrizesPaid: 300,
        profit: 500,
        payableAmount: 125,
        percentage: 25,
        createdBy: 'owner-1'
      })
    );
    expect(created.id).toBe('new-settlement');
  });

  it('rechaza liquidaciones superpuestas', async () => {
    (cashierAccountsRepository.findOverlappingSettlement as jest.Mock).mockResolvedValue(
      makeSettlement()
    );

    await expect(
      domain.createSettlement('owner-1', 'cashier-1', {
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-07')
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCode.ALREADY_EXISTS
    });
  });

  it('rechaza liquidar un período sin comisión configurada', async () => {
    (cashierAccountsRepository.findOverlappingSettlement as jest.Mock).mockResolvedValue(null);
    (cashierAccountsRepository.findCompensationModeForPeriod as jest.Mock).mockResolvedValue(null);

    await expect(
      domain.createSettlement('owner-1', 'cashier-1', {
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-07')
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCode.INVALID_INPUT
    });
  });

  it('marca una liquidación pendiente como pagada', async () => {
    const settlement = makeSettlement();
    (cashierAccountsRepository.findSettlementById as jest.Mock).mockResolvedValue(settlement);
    (cashierAccountsRepository.markSettlementPaid as jest.Mock).mockResolvedValue({
      ...settlement,
      status: SettlementStatus.PAID,
      paidAt: new Date('2026-01-10'),
      paymentReference: 'transfer-1'
    });

    const paid = await domain.paySettlement('owner-1', 'settlement-1', {
      paymentReference: 'transfer-1'
    });

    expect(cashierAccountsRepository.markSettlementPaid).toHaveBeenCalledWith(
      'settlement-1',
      expect.objectContaining({ paidBy: 'owner-1', paymentReference: 'transfer-1' })
    );
    expect(paid.status).toBe(SettlementStatus.PAID);
  });

  it('no permite pagar dos veces la misma liquidación', async () => {
    (cashierAccountsRepository.findSettlementById as jest.Mock).mockResolvedValue(
      makeSettlement({ status: SettlementStatus.PAID })
    );

    await expect(
      domain.paySettlement('owner-1', 'settlement-1', {})
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCode.ALREADY_EXISTS
    });
  });

  it('reemplaza la modalidad de comisión cerrando la anterior', async () => {
    (cashierAccountsRepository.createCompensationMode as jest.Mock).mockResolvedValue({
      id: 'mode-3',
      cashierId: 'cashier-1',
      type: CompensationType.PERCENTAGE,
      percentage: 30,
      activeFrom: new Date(),
      activeTo: null,
      createdAt: new Date()
    });

    const mode = await domain.updateCompensation('owner-1', 'cashier-1', {
      type: CompensationType.PERCENTAGE,
      percentage: 30
    });

    expect(cashierAccountsRepository.closeActiveCompensationModes).toHaveBeenCalledWith(
      'cashier-1',
      expect.any(Date)
    );
    expect(cashierAccountsRepository.createCompensationMode).toHaveBeenCalledWith(
      expect.objectContaining({ cashierId: 'cashier-1', percentage: 30 })
    );
    expect(mode.percentage).toBe(30);
  });

  it('solo el propietario puede consultar las cuentas', async () => {
    (usersRepository.findById as jest.Mock).mockResolvedValue({
      ...owner,
      role: UserRole.ADMIN
    });

    await expect(domain.listAccounts('owner-1')).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCode.FORBIDDEN
    });
  });
});
