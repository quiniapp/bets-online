import {
  AdminChipPurchaseStatus,
  ChipMovementType,
  DEFAULT_ADMIN_CHIP_PRICE_TIERS,
  ErrorCode,
  UserRole,
  quoteAdminChipPurchase
} from 'helper';

jest.mock('../../src/persistence/models', () => ({}));
jest.mock('../../src/config/sequelize', () => ({
  sequelize: {
    transaction: jest.fn((callback: (t: unknown) => unknown) => callback({ id: 'tx' }))
  }
}));
jest.mock('../../src/utils/audit', () => ({ writeAudit: jest.fn() }));
jest.mock('../../src/features/users/users.repository', () => ({
  usersRepository: {
    findById: jest.fn(),
    findDescendants: jest.fn(),
    isDescendant: jest.fn()
  }
}));
jest.mock('../../src/features/chips/balances.repository', () => ({
  balancesRepository: {
    findByUserIds: jest.fn(),
    findByUserIdWithLock: jest.fn(),
    atomicIncrement: jest.fn()
  }
}));
jest.mock('../../src/features/chips/chip-movements.repository', () => ({
  chipMovementsRepository: {
    create: jest.fn(),
    findByIdempotencyKey: jest.fn()
  }
}));
jest.mock('../../src/features/admin-chip-purchases/admin-chip-purchases.repository', () => ({
  purchaseMovementKey: (id: string, suffix: string) => `admin-purchase:${id}:${suffix}`,
  adminChipPurchasesRepository: {
    findPricing: jest.fn(),
    upsertPricing: jest.fn(),
    deletePricing: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByChipMovementId: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    pendingByAdmin: jest.fn(),
    usernames: jest.fn()
  }
}));

import { AdminChipPurchasesDomain } from '../../src/features/admin-chip-purchases/admin-chip-purchases.domain';
import { usersRepository } from '../../src/features/users/users.repository';
import { balancesRepository } from '../../src/features/chips/balances.repository';
import { chipMovementsRepository } from '../../src/features/chips/chip-movements.repository';
import { adminChipPurchasesRepository } from '../../src/features/admin-chip-purchases/admin-chip-purchases.repository';

const repo = adminChipPurchasesRepository as unknown as Record<string, jest.Mock>;

const owner = { id: 'owner-1', role: UserRole.OWNER, username: 'owner', parentUserId: null };
const admin = { id: 'admin-1', role: UserRole.ADMIN, username: 'admin1', parentUserId: 'owner-1' };

const makePurchase = (overrides: Record<string, unknown> = {}) => ({
  id: 'purchase-1',
  receiptNumber: 7,
  adminId: 'admin-1',
  chips: 500_000,
  percentage: 19,
  amount: 95_000,
  manualPercentage: false,
  status: AdminChipPurchaseStatus.PENDING,
  paymentReference: null,
  notes: null,
  createdBy: 'owner-1',
  createdAt: new Date('2026-11-24T12:00:00.000Z'),
  ...overrides
});

describe('quoteAdminChipPurchase', () => {
  it.each([
    [100_000, 20, 20_000],
    [499_999, 20, 99_999.8],
    [500_000, 19, 95_000],
    [1_000_000, 18, 180_000],
    [10_000_000, 17, 1_700_000],
    [20_000_000, 16, 3_200_000],
    [30_000_000, 15, 4_500_000],
    [50_000_000, 15, 7_500_000]
  ])('%d fichas → %d%% = %d', (chips, percentage, amount) => {
    expect(quoteAdminChipPurchase(DEFAULT_ADMIN_CHIP_PRICE_TIERS, chips)).toMatchObject({
      percentage,
      amount,
      requiresManualPercentage: false
    });
  });

  it('por debajo del primer tramo pide el porcentaje a mano', () => {
    expect(quoteAdminChipPurchase(DEFAULT_ADMIN_CHIP_PRICE_TIERS, 50_000)).toMatchObject({
      percentage: null,
      amount: null,
      requiresManualPercentage: true
    });
    expect(quoteAdminChipPurchase(DEFAULT_ADMIN_CHIP_PRICE_TIERS, 50_000, 22)).toMatchObject({
      percentage: 22,
      amount: 11_000,
      requiresManualPercentage: true
    });
  });

  it('ignora el porcentaje manual desde el primer tramo', () => {
    expect(quoteAdminChipPurchase(DEFAULT_ADMIN_CHIP_PRICE_TIERS, 200_000, 5).percentage).toBe(20);
  });
});

describe('AdminChipPurchasesDomain', () => {
  let domain: AdminChipPurchasesDomain;

  beforeEach(() => {
    jest.clearAllMocks();
    domain = new AdminChipPurchasesDomain();
    (usersRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? owner : id === 'admin-1' ? admin : null)
    );
    (usersRepository.isDescendant as jest.Mock).mockResolvedValue(true);
    (usersRepository.findDescendants as jest.Mock).mockResolvedValue([admin]);
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({
      userId: 'admin-1',
      chipBalance: 1000
    });
    (chipMovementsRepository.create as jest.Mock).mockResolvedValue({ id: 'movement-1' });
    repo.findPricing.mockResolvedValue(new Map());
    repo.create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(makePurchase({ ...data }))
    );
    repo.update.mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve(makePurchase({ id, ...data }))
    );
  });

  it('carga las fichas al admin y deja el pago pendiente con el precio del tramo', async () => {
    const purchase = await domain.createPurchase('owner-1', { adminId: 'admin-1', chips: 1_000_000 });

    expect(chipMovementsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        relatedUserId: 'owner-1',
        type: ChipMovementType.SELL_TO_PLAYER,
        amount: 1_000_000,
        previousBalance: 1000,
        newBalance: 1_001_000
      }),
      expect.anything()
    );
    expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('admin-1', 1_000_000, expect.anything());
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 18, amount: 180_000, manualPercentage: false }),
      expect.anything()
    );
    expect(purchase.status).toBe(AdminChipPurchaseStatus.PENDING);
  });

  it('usa los tramos propios del admin', async () => {
    repo.findPricing.mockResolvedValue(new Map([['admin-1', [{ minChips: 1000, percentage: 10 }]]]));

    await domain.createPurchase('owner-1', { adminId: 'admin-1', chips: 5000 });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 10, amount: 500 }),
      expect.anything()
    );
  });

  it('exige el porcentaje a mano en cargas menores al primer tramo', async () => {
    await expect(
      domain.createPurchase('owner-1', { adminId: 'admin-1', chips: 50_000 })
    ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });
    expect(chipMovementsRepository.create).not.toHaveBeenCalled();

    await domain.createPurchase('owner-1', { adminId: 'admin-1', chips: 50_000, percentage: 25 });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 25, amount: 12_500, manualPercentage: true }),
      expect.anything()
    );
  });

  it('solo el owner carga fichas a admins', async () => {
    await expect(
      domain.createPurchase('admin-1', { adminId: 'admin-1', chips: 200_000 })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('confirma el pago de una compra pendiente', async () => {
    repo.findById.mockResolvedValue(makePurchase());

    const confirmed = await domain.confirmPayment('owner-1', 'purchase-1', { paymentReference: 'transf 123' });

    expect(repo.update).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        status: AdminChipPurchaseStatus.PAID,
        confirmedBy: 'owner-1',
        paymentReference: 'transf 123'
      }),
      expect.anything()
    );
    expect(confirmed.status).toBe(AdminChipPurchaseStatus.PAID);
  });

  it('no confirma dos veces', async () => {
    repo.findById.mockResolvedValue(makePurchase({ status: AdminChipPurchaseStatus.PAID }));

    await expect(domain.confirmPayment('owner-1', 'purchase-1', {})).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it('anula una compra pendiente retirándole las fichas al admin', async () => {
    repo.findById.mockResolvedValue(makePurchase({ chips: 800 }));

    await domain.cancelPurchase('owner-1', 'purchase-1', 'error de carga');

    expect(chipMovementsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        type: ChipMovementType.ADJUSTMENT,
        amount: -800,
        idempotencyKey: 'admin-purchase:purchase-1:reversal'
      }),
      expect.anything()
    );
    expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('admin-1', -800, expect.anything());
  });

  it('no anula si el admin ya no tiene las fichas', async () => {
    repo.findById.mockResolvedValue(makePurchase({ chips: 5000 }));

    await expect(domain.cancelPurchase('owner-1', 'purchase-1')).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCode.INSUFFICIENT_BALANCE
    });
    expect(balancesRepository.atomicIncrement).not.toHaveBeenCalled();
  });
});
