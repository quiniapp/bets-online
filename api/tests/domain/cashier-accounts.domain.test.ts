import {
  ChipMovementType,
  CompensationType,
  ErrorCode,
  SettlementStatus,
  UserRole
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
    findByUserId: jest.fn(),
    findByUserIdWithLock: jest.fn(),
    atomicIncrement: jest.fn()
  }
}));
jest.mock('../../src/features/chips/chip-movements.repository', () => ({
  chipMovementsRepository: {
    create: jest.fn()
  }
}));
jest.mock('../../src/features/cashier-accounts/cashier-accounts.repository', () => ({
  settlementMovementKey: (id: string, suffix: string) => `settlement:${id}:${suffix}`,
  cashierAccountsRepository: {
    findCompensationModes: jest.fn(),
    findCompensationModeForPeriod: jest.fn(),
    closeActiveCompensationModes: jest.fn(),
    createCompensationMode: jest.fn(),
    findNonCanceledSettlements: jest.fn(),
    findSettlementsForCashier: jest.fn(),
    findSettlementById: jest.fn(),
    findLastSettlement: jest.fn(),
    findOverlappingSettlement: jest.fn(),
    findSettlementsOverlapping: jest.fn(),
    findSettlementsClosedInRange: jest.fn(),
    createSettlement: jest.fn(),
    updateSettlementCollection: jest.fn(),
    markSettlementCanceled: jest.fn(),
    createCollection: jest.fn(),
    findCollectionsForCashier: jest.fn(),
    findCollectionsInRange: jest.fn(),
    getMovementTotals: jest.fn(),
    getPeriodFlows: jest.fn(),
    findLedgerChipMovements: jest.fn(),
    findFirstMovementAt: jest.fn(),
    findSettlementChipMovements: jest.fn(),
    findSettlements: jest.fn()
  }
}));

import { CashierAccountsDomain } from '../../src/features/cashier-accounts/cashier-accounts.domain';
import { usersRepository } from '../../src/features/users/users.repository';
import { balancesRepository } from '../../src/features/chips/balances.repository';
import { chipMovementsRepository } from '../../src/features/chips/chip-movements.repository';
import { cashierAccountsRepository } from '../../src/features/cashier-accounts/cashier-accounts.repository';

const repo = cashierAccountsRepository as unknown as Record<string, jest.Mock>;

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
  ...owner,
  id: 'cashier-1',
  role: UserRole.CASHIER,
  username: 'cajero1',
  parentUserId: 'owner-1',
  email: 'cajero@example.com',
  firstName: 'Cajero',
  lastName: 'Uno'
};

const mode20 = {
  id: 'mode-1',
  cashierId: 'cashier-1',
  type: CompensationType.PERCENTAGE,
  percentage: 20,
  activeFrom: new Date('2025-01-01'),
  activeTo: null,
  createdAt: new Date('2025-01-01')
};

const periodStart = new Date('2026-11-15T03:00:00.000Z');
const periodEnd = new Date('2026-11-22T02:59:59.999Z');

const makeSettlement = (overrides: Record<string, unknown> = {}) => ({
  id: 'settlement-1',
  cashierId: 'cashier-1',
  periodStart: new Date('2026-11-08T03:00:00.000Z'),
  periodEnd: new Date('2026-11-15T02:59:59.999Z'),
  totalSales: 500,
  totalPrizesPaid: 0,
  profit: 400,
  payableAmount: 100,
  status: SettlementStatus.PARTIALLY_PAID,
  compensationType: CompensationType.PERCENTAGE,
  percentage: 20,
  notes: null,
  createdBy: 'owner-1',
  paidBy: null,
  paymentReference: null,
  createdAt: new Date('2026-11-15T02:00:00.000Z'),
  paidAt: null,
  commission: 100,
  subtotal: 400,
  previousDebt: 0,
  totalDue: 400,
  collected: 370,
  debtCarried: 30,
  chipsDelivered: 500,
  chipBalanceBefore: 0,
  prizeChipsRecovered: 0,
  unsoldChips: 0,
  chipsLeft: 0,
  unsoldChipsRecovered: 0,
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
    repo.findOverlappingSettlement.mockResolvedValue(null);
    repo.findLastSettlement.mockResolvedValue(null);
    repo.findCompensationModeForPeriod.mockResolvedValue(mode20);
    repo.createSettlement.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ ...makeSettlement(), ...data })
    );
  });

  describe('cálculo de la liquidación', () => {
    it('ejemplo del negocio: entrega 1000, vende 900 al 20% → subtotal 720 y 100 no vendidas', () => {
      const preview = domain.computePreview({
        cashier: cashier as never,
        periodStart,
        periodEnd,
        compensation: mode20,
        flows: { chipsDelivered: 1000, totalSales: 900, totalPrizes: 0 },
        lastSettlement: null,
        chipBalance: 100
      });

      expect(preview).toMatchObject({
        chipsDelivered: 1000,
        totalSales: 900,
        commission: 180,
        subtotal: 720,
        previousDebt: 0,
        totalDue: 720,
        prizeChipsToRecover: 0,
        unsoldChips: 100,
        profit: 720
      });
    });

    it('suma la deuda arrastrada y separa las fichas de premios de las no vendidas', () => {
      const preview = domain.computePreview({
        cashier: cashier as never,
        periodStart,
        periodEnd,
        compensation: mode20,
        flows: { chipsDelivered: 1000, totalSales: 900, totalPrizes: 50 },
        lastSettlement: makeSettlement() as never,
        chipBalance: 150
      });

      expect(preview).toMatchObject({
        subtotal: 720,
        previousDebt: 30,
        totalDue: 750,
        prizeChipsToRecover: 50,
        unsoldChips: 100,
        profit: 670,
        unsettledSince: null
      });
    });

    it('avisa si hay un hueco sin liquidar antes del período', () => {
      const preview = domain.computePreview({
        cashier: cashier as never,
        periodStart: new Date('2026-11-17T03:00:00.000Z'),
        periodEnd,
        compensation: mode20,
        flows: { chipsDelivered: 0, totalSales: 0, totalPrizes: 0 },
        lastSettlement: makeSettlement() as never,
        chipBalance: 0
      });

      expect(preview.unsettledSince).toEqual(new Date('2026-11-15T02:59:59.999Z'));
    });
  });

  describe('createSettlement', () => {
    beforeEach(() => {
      repo.findLastSettlement.mockResolvedValue(makeSettlement());
      repo.getPeriodFlows.mockResolvedValue({
        chipsDelivered: 1000,
        totalSales: 900,
        totalPrizes: 50
      });
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({
        userId: 'cashier-1',
        chipBalance: 150
      });
    });

    it('cobra parcial, arrastra la deuda y retira fichas de premios y parte de las no vendidas', async () => {
      const created = await domain.createSettlement('owner-1', 'cashier-1', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        collected: 700,
        chipsLeft: 60
      });

      expect(repo.createSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          cashierId: 'cashier-1',
          periodStart,
          periodEnd,
          totalSales: 900,
          totalPrizesPaid: 50,
          commission: 180,
          payableAmount: 180,
          subtotal: 720,
          previousDebt: 30,
          totalDue: 750,
          collected: 700,
          debtCarried: 50,
          chipsDelivered: 1000,
          chipBalanceBefore: 150,
          prizeChipsRecovered: 50,
          unsoldChips: 100,
          chipsLeft: 60,
          unsoldChipsRecovered: 40,
          status: SettlementStatus.PARTIALLY_PAID,
          percentage: 20
        }),
        expect.anything()
      );

      const movements = (chipMovementsRepository.create as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(movements).toEqual([
        expect.objectContaining({
          userId: 'cashier-1',
          relatedUserId: 'owner-1',
          type: ChipMovementType.RECOVERY,
          amount: -50,
          previousBalance: 150,
          newBalance: 100,
          idempotencyKey: `settlement:${created.id}:prizes`
        }),
        expect.objectContaining({
          amount: -40,
          previousBalance: 100,
          newBalance: 60,
          idempotencyKey: `settlement:${created.id}:unsold`
        })
      ]);
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', -50, expect.anything());
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', -40, expect.anything());
      expect(repo.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ cashierId: 'cashier-1', amount: 700, createdBy: 'owner-1' }),
        expect.anything()
      );
    });

    it('por defecto cobra el total y le deja al cajero todas las fichas no vendidas', async () => {
      await domain.createSettlement('owner-1', 'cashier-1', { periodStart, periodEnd });

      expect(repo.createSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          collected: 750,
          debtCarried: 0,
          chipsLeft: 100,
          unsoldChipsRecovered: 0,
          status: SettlementStatus.PAID
        }),
        expect.anything()
      );
      // Solo se retiran las fichas de premios.
      expect(chipMovementsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('rechaza un deje mayor a las fichas no vendidas', async () => {
      await expect(
        domain.createSettlement('owner-1', 'cashier-1', { periodStart, periodEnd, chipsLeft: 101 })
      ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });
      expect(repo.createSettlement).not.toHaveBeenCalled();
    });

    it('arranca justo después de la última liquidación, sin importar el inicio que mande el cliente', async () => {
      await domain.createSettlement('owner-1', 'cashier-1', {
        periodStart: '2026-11-21T03:00:00.000Z',
        periodEnd: periodEnd.toISOString()
      });

      expect(repo.getPeriodFlows).toHaveBeenCalledWith(
        'cashier-1',
        new Date('2026-11-15T03:00:00.000Z'),
        periodEnd,
        expect.anything()
      );
    });

    it('la primera liquidación arranca en el primer movimiento del cajero', async () => {
      repo.findLastSettlement.mockResolvedValue(null);
      repo.findFirstMovementAt.mockResolvedValue(new Date('2026-11-15T13:00:00.000Z'));

      await domain.createSettlement('owner-1', 'cashier-1', { periodEnd });

      expect(repo.createSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: new Date('2026-11-15T13:00:00.000Z'),
          previousDebt: 0
        }),
        expect.anything()
      );
    });

    it('rechaza si el cajero ya está liquidado hasta el corte', async () => {
      repo.findLastSettlement.mockResolvedValue(
        makeSettlement({ periodEnd: new Date('2026-11-22T10:00:00.000Z') })
      );

      await expect(
        domain.createSettlement('owner-1', 'cashier-1', { periodEnd })
      ).rejects.toMatchObject({ statusCode: 409, code: ErrorCode.ALREADY_EXISTS });
      expect(repo.createSettlement).not.toHaveBeenCalled();
    });

    it('un corte en el futuro se recorta a ahora', async () => {
      const before = Date.now();
      await domain.createSettlement('owner-1', 'cashier-1', {
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      const saved = repo.createSettlement.mock.calls[0][0] as { periodEnd: Date };
      expect(saved.periodEnd.getTime() <= Date.now()).toBe(true);
      expect(saved.periodEnd.getTime() >= before).toBe(true);
    });

    it('rechaza liquidar sin comisión configurada', async () => {
      repo.findCompensationModeForPeriod.mockResolvedValue(null);

      await expect(
        domain.createSettlement('owner-1', 'cashier-1', { periodStart, periodEnd })
      ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.INVALID_INPUT });
    });
  });

  describe('cuenta corriente a una fecha de corte', () => {
    it('muestra en vivo desde la última liquidación y la liquidación si ya cubre el corte', async () => {
      const other = { ...cashier, id: 'cashier-2', username: 'cajero2' };
      (usersRepository.findDescendants as jest.Mock).mockResolvedValue([cashier, other]);
      repo.findLastSettlement.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'cashier-1'
            ? makeSettlement()
            : makeSettlement({ id: 'settlement-9', cashierId: 'cashier-2', periodEnd: new Date('2026-11-22T10:00:00.000Z') })
        )
      );
      repo.getPeriodFlows.mockResolvedValue({ chipsDelivered: 60000, totalSales: 50000, totalPrizes: 0 });
      (balancesRepository.findByUserId as jest.Mock).mockResolvedValue({ userId: 'cashier-1', chipBalance: 10000 });

      const result = await domain.getPeriodAccounts('owner-1', periodEnd);
      const [first, second] = result.accounts;

      expect(first.settlement).toBe(null);
      expect(first.preview).toMatchObject({
        periodStart: new Date('2026-11-15T03:00:00.000Z'),
        totalSales: 50000,
        commission: 10000,
        subtotal: 40000,
        previousDebt: 30,
        totalDue: 40030,
        unsoldChips: 10000
      });
      expect(second.settlement?.id).toBe('settlement-9');
    });
  });

  describe('collectSettlement', () => {
    it('suma un cobro posterior a la última liquidación', async () => {
      const settlement = makeSettlement();
      repo.findSettlementById.mockResolvedValue(settlement);
      repo.findLastSettlement.mockResolvedValue(settlement);
      repo.updateSettlementCollection.mockImplementation((_id: string, data: Record<string, unknown>) =>
        Promise.resolve({ ...settlement, ...data })
      );

      const updated = await domain.collectSettlement('owner-1', 'settlement-1', { amount: 30 });

      expect(repo.updateSettlementCollection).toHaveBeenCalledWith(
        'settlement-1',
        expect.objectContaining({ collected: 400, debtCarried: 0, status: SettlementStatus.PAID }),
        expect.anything()
      );
      expect(repo.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ settlementId: 'settlement-1', amount: 30 }),
        expect.anything()
      );
      expect(updated.debtCarried).toBe(0);
    });

    it('no permite cobrar sobre una liquidación que no es la última', async () => {
      repo.findSettlementById.mockResolvedValue(makeSettlement());
      repo.findLastSettlement.mockResolvedValue(makeSettlement({ id: 'settlement-2' }));

      await expect(
        domain.collectSettlement('owner-1', 'settlement-1', { amount: 10 })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(repo.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('cancelSettlement', () => {
    it('devuelve al cajero las fichas retiradas y anula la liquidación', async () => {
      const settlement = makeSettlement();
      repo.findSettlementById.mockResolvedValue(settlement);
      repo.findLastSettlement.mockResolvedValue(settlement);
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({
        userId: 'cashier-1',
        chipBalance: 60
      });
      repo.findSettlementChipMovements.mockResolvedValue([
        { id: 'm1', userId: 'cashier-1', amount: -50, key: 'settlement:settlement-1:prizes' },
        { id: 'm2', userId: 'cashier-1', amount: -40, key: 'settlement:settlement-1:unsold' }
      ]);
      repo.markSettlementCanceled.mockResolvedValue({
        ...settlement,
        status: SettlementStatus.CANCELED
      });

      const canceled = await domain.cancelSettlement('owner-1', 'settlement-1', 'error de carga');

      expect(chipMovementsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cashier-1',
          type: ChipMovementType.ADJUSTMENT,
          amount: 90,
          previousBalance: 60,
          newBalance: 150,
          idempotencyKey: 'settlement:settlement-1:reversal'
        }),
        expect.anything()
      );
      expect(balancesRepository.atomicIncrement).toHaveBeenCalledWith('cashier-1', 90, expect.anything());
      expect(canceled.status).toBe(SettlementStatus.CANCELED);
    });

    it('solo se puede cancelar la última liquidación', async () => {
      repo.findSettlementById.mockResolvedValue(makeSettlement());
      repo.findLastSettlement.mockResolvedValue(makeSettlement({ id: 'settlement-2' }));
      (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({
        userId: 'cashier-1',
        chipBalance: 0
      });

      await expect(
        domain.cancelSettlement('owner-1', 'settlement-1')
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('cuentas de cajeros', () => {
    it('calcula lo abierto, la deuda arrastrada y el saldo a cobrar', async () => {
      repo.findCompensationModes.mockResolvedValue([mode20]);
      repo.findNonCanceledSettlements.mockResolvedValue([makeSettlement()]);
      repo.getMovementTotals.mockResolvedValue(
        new Map([['cashier-1', { totalSales: 1400, totalPrizes: 50 }]])
      );

      const result = await domain.listAccounts('owner-1');

      expect(result.accounts[0]).toMatchObject({
        chipBalance: 125,
        totalSales: 1400,
        openSales: 900,
        openPrizes: 50,
        openCommission: 180,
        openSubtotal: 720,
        debt: 30,
        balanceDue: 750,
        totalCommission: 280,
        totalCollected: 370
      });
      expect(result.summary).toMatchObject({ totalCashiers: 1, balanceDue: 750, debt: 30 });
    });

    it('arma la cuenta corriente con movimientos de fichas y de dinero', async () => {
      const settlement = makeSettlement();
      repo.findCompensationModes.mockResolvedValue([mode20]);
      repo.findNonCanceledSettlements.mockResolvedValue([settlement]);
      repo.getMovementTotals.mockResolvedValue(new Map());
      repo.findSettlementsForCashier.mockResolvedValue([settlement]);
      repo.findCollectionsForCashier.mockResolvedValue([
        {
          id: 'col-1',
          settlementId: 'settlement-1',
          cashierId: 'cashier-1',
          amount: 370,
          paymentReference: null,
          createdBy: 'owner-1',
          createdAt: new Date('2026-11-15T02:00:01.000Z')
        }
      ]);
      repo.findLedgerChipMovements.mockResolvedValue([
        {
          id: 'c1', user_id: 'cashier-1', related_user_id: 'owner-1', username: 'owner',
          type: 'SELL_TO_PLAYER', amount: '1000', description: null, idempotency_key: null,
          created_at: new Date('2026-11-16T12:00:00.000Z')
        },
        {
          id: 'c2', user_id: 'player-1', related_user_id: 'cashier-1', username: 'jugador',
          type: 'SELL_TO_PLAYER', amount: '200', description: null, idempotency_key: null,
          created_at: new Date('2026-11-16T13:00:00.000Z')
        },
        {
          id: 'c3', user_id: 'player-1', related_user_id: 'cashier-1', username: 'jugador',
          type: 'PRIZE', amount: '-50', description: null, idempotency_key: null,
          created_at: new Date('2026-11-16T14:00:00.000Z')
        },
        {
          id: 'c4', user_id: 'cashier-1', related_user_id: 'owner-1', username: 'owner',
          type: 'RECOVERY', amount: '-50', description: null,
          idempotency_key: 'settlement:settlement-1:prizes',
          created_at: new Date('2026-11-15T02:00:00.000Z')
        }
      ]);

      const detail = await domain.getAccount('owner-1', 'cashier-1');
      const byId = new Map(detail.movements.map(m => [m.id, m]));

      expect(byId.get('c1')).toMatchObject({ kind: 'CHIPS_DELIVERED', chips: 1000 });
      expect(byId.get('c2')).toMatchObject({ kind: 'SALE', chips: -200, playerUsername: 'jugador' });
      expect(byId.get('c3')).toMatchObject({ kind: 'PRIZE', chips: 50 });
      expect(byId.get('c4')).toMatchObject({
        kind: 'PRIZE_CHIPS_RECOVERED',
        chips: -50,
        settlementId: 'settlement-1'
      });
      expect(byId.get('settlement-1:settlement')).toMatchObject({ kind: 'SETTLEMENT', money: 400 });
      expect(byId.get('col-1:collection')).toMatchObject({ kind: 'COLLECTION', money: -370 });
      // Orden: más reciente primero.
      expect(detail.movements[0].id).toBe('c3');
    });
  });

  describe('cuenta del owner', () => {
    it('suma ingreso neto, premios, ganancia y caja del rango', async () => {
      (usersRepository.findDescendants as jest.Mock).mockResolvedValue([
        cashier,
        { ...cashier, id: 'player-1', role: UserRole.PLAYER, username: 'jugador' }
      ]);
      (balancesRepository.findByUserIds as jest.Mock).mockImplementation((ids: string[]) =>
        Promise.resolve(
          ids.includes('player-1')
            ? [{ userId: 'player-1', chipBalance: 300 }]
            : [{ userId: 'cashier-1', chipBalance: 60 }]
        )
      );
      repo.findCompensationModes.mockResolvedValue([mode20]);
      repo.findNonCanceledSettlements.mockResolvedValue([
        makeSettlement({ totalSales: 900, debtCarried: 50 })
      ]);
      repo.getMovementTotals.mockResolvedValue(
        new Map([['cashier-1', { totalSales: 900, totalPrizes: 50 }]])
      );
      repo.findSettlementsClosedInRange.mockResolvedValue([
        {
          ...makeSettlement({
            id: 'settlement-2',
            totalSales: 900,
            totalPrizesPaid: 50,
            commission: 180,
            subtotal: 720,
            collected: 700,
            chipsDelivered: 1000,
            prizeChipsRecovered: 50,
            unsoldChipsRecovered: 40
          }),
          cashierUsername: 'cajero1'
        }
      ]);
      repo.findCollectionsInRange.mockResolvedValue([
        {
          id: 'col-2',
          settlementId: 'settlement-2',
          cashierId: 'cashier-1',
          amount: 700,
          paymentReference: 'efectivo',
          createdBy: 'owner-1',
          createdAt: new Date('2026-11-22T01:00:00.000Z')
        }
      ]);

      const result = await domain.getOwnerAccount('owner-1', periodStart, periodEnd);

      expect(result.settled).toMatchObject({
        settlements: 1,
        totalSales: 900,
        commission: 180,
        subtotal: 720,
        prizes: 50,
        profit: 670,
        collected: 700,
        cashFlow: 650,
        chipsDelivered: 1000,
        chipsRecovered: 90
      });
      expect(result.collectedInRange).toBe(700);
      expect(result.current).toMatchObject({
        cashierDebt: 50,
        cashierChips: 60,
        playerChips: 300
      });
      expect(result.movements.map(m => m.kind).sort()).toEqual(['COLLECTION', 'PRIZES', 'SETTLEMENT']);
    });
  });

  it('reemplaza la modalidad de comisión cerrando la anterior', async () => {
    repo.createCompensationMode.mockResolvedValue({ ...mode20, id: 'mode-3', percentage: 30 });

    const mode = await domain.updateCompensation('owner-1', 'cashier-1', {
      type: CompensationType.PERCENTAGE,
      percentage: 30
    });

    expect(repo.closeActiveCompensationModes).toHaveBeenCalledWith('cashier-1', expect.any(Date));
    expect(mode.percentage).toBe(30);
  });

  it('solo el propietario puede consultar las cuentas', async () => {
    (usersRepository.findById as jest.Mock).mockResolvedValue({ ...owner, role: UserRole.ADMIN });

    await expect(domain.listAccounts('owner-1')).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCode.FORBIDDEN
    });
  });
});
