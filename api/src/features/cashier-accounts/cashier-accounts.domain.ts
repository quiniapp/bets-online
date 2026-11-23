import { randomUUID } from 'crypto';
import { Transaction } from 'sequelize';
import {
  CashierAccountMovement,
  CashierAccountSummary,
  CashierAccountsSummary,
  CashierCollection,
  CashierCollectionKind,
  CashierCollectionStatus,
  CashierCompensationMode,
  CashierLedgerKind,
  CashierOwnSettlementsResult,
  CashierPeriodAccount,
  CashierPeriodAccountTotals,
  CashierSettlement,
  CashierSettlementPreview,
  ChipMovementType,
  CompensationType,
  ErrorCode,
  OwnerAccountMovement,
  OwnerAccountSummary,
  OwnerAccountTotals,
  SettlementStatus,
  User,
  UserRole,
  settlementCollectionAmount
} from 'helper';
import { usersRepository } from '../users/users.repository';
import { balancesRepository } from '../chips/balances.repository';
import { chipMovementsRepository } from '../chips/chip-movements.repository';
import {
  cashierAccountsRepository,
  LedgerChipRow,
  PeriodFlows,
  settlementMovementKey
} from './cashier-accounts.repository';
import { sequelize } from '../../config/sequelize';
import { config } from '../../config';
import { AppError } from '../../middleware/error.middleware';
import { writeAudit } from '../../utils/audit';
import {
  generateOwnerAccountPdf,
  generatePeriodSummaryPdf,
  generateSettlementReceiptPdf
} from '../../utils/settlement-receipt.utils';

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Margen para considerar que dos períodos son contiguos (fin 23:59:59.999 → inicio 00:00). */
const CONTIGUITY_TOLERANCE_MS = 1000;

const LEDGER_LIMIT = 150;

/** Liquidación del modelo anterior (comisión pagada al cajero, sin flujo de fichas). */
const isLegacySettlement = (settlement: CashierSettlement): boolean =>
  settlement.subtotal === null || settlement.subtotal === undefined;

const settlementCommission = (settlement: CashierSettlement): number =>
  settlement.commission ?? settlement.payableAmount;

const settlementSubtotal = (settlement: CashierSettlement): number =>
  settlement.subtotal ?? roundMoney(settlement.totalSales - settlementCommission(settlement));

const sumAmounts = (collections: CashierCollection[]): number =>
  roundMoney(collections.reduce((sum, collection) => sum + collection.amount, 0));

/**
 * Estado de una liquidación según lo cobrado:
 * cobrada (sin deuda), cobro parcial, o sin cobrar.
 */
const statusForCollection = (collected: number, debtCarried: number): SettlementStatus => {
  if (debtCarried <= 0) return SettlementStatus.PAID;
  if (collected > 0) return SettlementStatus.PARTIALLY_PAID;
  return SettlementStatus.PENDING;
};

interface PreviewInputs {
  cashier: User;
  periodStart: Date;
  periodEnd: Date;
  compensation: CashierCompensationMode | null;
  flows: PeriodFlows;
  lastSettlement: CashierSettlement | null;
  chipBalance: number;
  /** Cobros a cuenta sin liquidar que se descuentan */
  onAccountCollected?: number;
}

export class CashierAccountsDomain {
  // ─────────────────────────────────────────────────────────────────────────
  // Cuentas de cajeros
  // ─────────────────────────────────────────────────────────────────────────

  async listAccounts(
    requesterId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    await this.assertOwner(requesterId);

    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const search = (options.search ?? '').trim().toLowerCase();

    const cashiers = await this.getOwnerCashiers(requesterId);
    const filtered = search
      ? cashiers.filter(cashier => this.matchesSearch(cashier, search))
      : cashiers;

    const summaries = await this.buildSummaries(filtered);
    const total = summaries.length;
    const accounts = summaries.slice((page - 1) * limit, page * limit);

    return { accounts, summary: this.sumSummaries(summaries), total, page, limit };
  }

  async getAccount(requesterId: string, cashierId: string) {
    await this.assertOwner(requesterId);
    const cashier = await this.getCashierInOwnerTree(requesterId, cashierId);

    const [summary] = await this.buildSummaries([cashier]);
    const [settlements, chipRows, collections] = await Promise.all([
      cashierAccountsRepository.findSettlementsForCashier(cashierId),
      cashierAccountsRepository.findLedgerChipMovements(cashierId, LEDGER_LIMIT),
      cashierAccountsRepository.findCollectionsForCashier(cashierId, LEDGER_LIMIT)
    ]);

    return {
      account: summary,
      settlements,
      movements: this.buildLedger(cashierId, chipRows, settlements, collections)
    };
  }

  async updateCompensation(
    requesterId: string,
    cashierId: string,
    data: { type: CompensationType; percentage: number }
  ) {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);

    const now = new Date();
    // Crear primero y cerrar después: si el cierre fallara, la nueva modalidad
    // ya quedó activa y nunca se pierde la configuración vigente.
    const mode = await cashierAccountsRepository.createCompensationMode({
      cashierId,
      type: data.type,
      percentage: roundMoney(data.percentage),
      activeFrom: now
    });
    await cashierAccountsRepository.closeActiveCompensationModes(cashierId, now);

    writeAudit({
      requesterId,
      action: 'cashier-accounts.compensation.update',
      entityType: 'user',
      entityId: cashierId,
      newValues: { type: data.type, percentage: data.percentage, activeFrom: now }
    });

    return mode;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Liquidación por período
  // ─────────────────────────────────────────────────────────────────────────

  async previewSettlement(
    requesterId: string,
    cashierId: string,
    periodEnd: Date | string
  ): Promise<CashierSettlementPreview> {
    await this.assertOwner(requesterId);
    const cashier = await this.getCashierInOwnerTree(requesterId, cashierId);

    const cutoff = this.normalizeCutoff(periodEnd);
    const lastSettlement = await cashierAccountsRepository.findLastSettlement(cashier.id);
    if (lastSettlement && lastSettlement.periodEnd >= cutoff) {
      return this.previewFromSettlement(cashier, lastSettlement);
    }
    const start = await this.resolvePeriodStart(cashier.id, cutoff, lastSettlement);
    return this.buildLivePreview(cashier, start, cutoff, lastSettlement);
  }

  /**
   * Cuenta corriente de todos los cajeros a una fecha de corte. Cada cajero
   * va desde el fin de su última liquidación (o su primer movimiento) hasta
   * el corte; si su última liquidación ya cubre el corte, se muestra esa.
   */
  async getPeriodAccounts(requesterId: string, periodEnd: Date | string) {
    await this.assertOwner(requesterId);
    const cutoff = this.normalizeCutoff(periodEnd);

    const cashiers = await this.getOwnerCashiers(requesterId);
    const accounts: CashierPeriodAccount[] = [];
    for (const cashier of cashiers) {
      const lastSettlement = await cashierAccountsRepository.findLastSettlement(cashier.id);
      if (lastSettlement && lastSettlement.periodEnd >= cutoff) {
        accounts.push({
          preview: this.previewFromSettlement(cashier, lastSettlement),
          settlement: lastSettlement
        });
        continue;
      }
      const start = await this.resolvePeriodStart(cashier.id, cutoff, lastSettlement);
      accounts.push({
        preview: await this.buildLivePreview(cashier, start, cutoff, lastSettlement),
        settlement: null
      });
    }

    const starts = accounts.map(account => account.preview.periodStart.getTime());
    return {
      periodStart: new Date(starts.length > 0 ? Math.min(...starts) : cutoff.getTime()),
      periodEnd: cutoff,
      accounts,
      totals: this.sumPeriodAccounts(accounts)
    };
  }

  async createSettlement(
    requesterId: string,
    cashierId: string,
    data: {
      /** Ignorado: el inicio lo calcula el servidor. */
      periodStart?: Date | string;
      periodEnd: Date | string;
      collected?: number;
      chipsLeft?: number;
      paymentReference?: string;
      notes?: string;
    }
  ): Promise<CashierSettlement> {
    await this.assertOwner(requesterId);
    const cashier = await this.getCashierInOwnerTree(requesterId, cashierId);

    // Express deja las fechas del body como string: validate() valida pero no
    // reemplaza req.body. El dominio normaliza para que el cálculo y el INSERT
    // reciban siempre Date. El corte nunca pasa de ahora: lo que entre después
    // va a la próxima liquidación.
    const periodEnd = this.normalizeCutoff(data.periodEnd);

    const settlementId = randomUUID();

    const result = await sequelize.transaction(async (t: Transaction) => {
      // Bloquear el saldo del cajero primero serializa liquidaciones
      // concurrentes del mismo cajero.
      const balance = await balancesRepository.findByUserIdWithLock(cashierId, t);
      if (!balance) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier balance not found');
      }

      const lastSettlement = await cashierAccountsRepository.findLastSettlement(cashierId, t);
      if (lastSettlement && lastSettlement.periodEnd >= periodEnd) {
        throw new AppError(
          409,
          ErrorCode.ALREADY_EXISTS,
          `El cajero ya está liquidado hasta el ${this.shortDate(lastSettlement.periodEnd)}.`
        );
      }
      // El período arranca donde terminó la última liquidación: no quedan huecos.
      const periodStart = await this.resolvePeriodStart(cashierId, periodEnd, lastSettlement, t);

      const compensation = await cashierAccountsRepository.findCompensationModeForPeriod(
        cashierId,
        periodStart,
        periodEnd
      );
      if (!compensation) {
        throw new AppError(
          400,
          ErrorCode.INVALID_INPUT,
          'El cajero no tiene una modalidad de comisión configurada para ese período'
        );
      }

      const [flows, onAccountCollections] = await Promise.all([
        cashierAccountsRepository.getPeriodFlows(cashierId, periodStart, periodEnd, t),
        cashierAccountsRepository.findUnappliedOnAccountCollections(cashierId, periodEnd, t)
      ]);
      const onAccountCollected = sumAmounts(onAccountCollections);
      const preview = this.computePreview({
        cashier,
        periodStart,
        periodEnd,
        compensation,
        flows,
        lastSettlement,
        chipBalance: balance.chipBalance,
        onAccountCollected
      });

      // El cobro de la liquidación queda pendiente hasta que el owner lo
      // confirma: lo cobrado (y la deuda) solo cuentan los cobros a cuenta.
      const pendingCollection = roundMoney(data.collected ?? Math.max(preview.amountDue, 0));
      const chipsLeft = roundMoney(data.chipsLeft ?? preview.unsoldChips);
      if (chipsLeft > preview.unsoldChips) {
        throw new AppError(
          400,
          ErrorCode.INVALID_INPUT,
          `Las fichas no vendidas que se le dejan no pueden superar ${preview.unsoldChips}.`
        );
      }
      const unsoldChipsRecovered = roundMoney(preview.unsoldChips - chipsLeft);
      const collected = onAccountCollected;
      const debtCarried = roundMoney(preview.totalDue - collected);
      const status = statusForCollection(collected, debtCarried);

      // Retiro de fichas al cajero: primero las de premios, después las no vendidas.
      let runningBalance = balance.chipBalance;
      const recover = async (amount: number, suffix: string, description: string) => {
        if (amount <= 0) return;
        await chipMovementsRepository.create(
          {
            userId: cashierId,
            relatedUserId: requesterId,
            type: ChipMovementType.RECOVERY,
            amount: -amount,
            description,
            previousBalance: runningBalance,
            newBalance: roundMoney(runningBalance - amount),
            idempotencyKey: settlementMovementKey(settlementId, suffix)
          },
          t
        );
        await balancesRepository.atomicIncrement(cashierId, -amount, t);
        runningBalance = roundMoney(runningBalance - amount);
      };

      await recover(
        preview.prizeChipsToRecover,
        'prizes',
        'Liquidación: retiro de fichas de premios'
      );
      await recover(
        unsoldChipsRecovered,
        'unsold',
        'Liquidación: retiro de fichas no vendidas'
      );

      const now = new Date();
      const settlement = await cashierAccountsRepository.createSettlement(
        {
          id: settlementId,
          cashierId,
          periodStart,
          periodEnd,
          totalSales: preview.totalSales,
          totalPrizesPaid: preview.totalPrizes,
          profit: preview.profit,
          payableAmount: preview.commission,
          status,
          compensationType: compensation.type,
          percentage: compensation.percentage ?? null,
          notes: data.notes?.trim() || null,
          createdBy: requesterId,
          paidBy: collected > 0 ? requesterId : null,
          paidAt: status === SettlementStatus.PAID ? now : null,
          paymentReference: data.paymentReference?.trim() || null,
          commission: preview.commission,
          subtotal: preview.subtotal,
          previousDebt: preview.previousDebt,
          totalDue: preview.totalDue,
          collected,
          debtCarried,
          chipsDelivered: preview.chipsDelivered,
          chipBalanceBefore: preview.chipBalance,
          prizeChipsRecovered: preview.prizeChipsToRecover,
          unsoldChips: preview.unsoldChips,
          chipsLeft,
          unsoldChipsRecovered,
          onAccountCollected,
          pendingCollection
        },
        t
      );

      await cashierAccountsRepository.linkCollectionsToSettlement(
        onAccountCollections.map(collection => collection.id),
        settlementId,
        t
      );

      if (pendingCollection > 0) {
        await cashierAccountsRepository.createCollection(
          {
            settlementId,
            cashierId,
            kind: CashierCollectionKind.SETTLEMENT,
            status: CashierCollectionStatus.PENDING,
            amount: pendingCollection,
            paymentReference: data.paymentReference?.trim() || null,
            createdBy: requesterId
          },
          t
        );
      }

      // Lo que quedó sin confirmar en la liquidación anterior ya pasó como
      // deuda (saldo anterior): ese cobro pendiente vence.
      if (lastSettlement && (lastSettlement.pendingCollection ?? 0) > 0) {
        await cashierAccountsRepository.setPendingCollectionsStatus(
          lastSettlement.id,
          CashierCollectionStatus.PENDING,
          CashierCollectionStatus.EXPIRED,
          t
        );
        await cashierAccountsRepository.updateSettlementCollection(
          lastSettlement.id,
          {
            collected: lastSettlement.collected ?? 0,
            debtCarried: lastSettlement.debtCarried ?? 0,
            status: lastSettlement.status,
            pendingCollection: 0
          },
          t
        );
      }

      return settlement;
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.create',
      entityType: 'chips',
      entityId: result.id,
      newValues: {
        cashierId,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        totalSales: result.totalSales,
        totalPrizes: result.totalPrizesPaid,
        commission: result.commission,
        subtotal: result.subtotal,
        collected: result.collected,
        onAccountCollected: result.onAccountCollected,
        pendingCollection: result.pendingCollection,
        debtCarried: result.debtCarried,
        prizeChipsRecovered: result.prizeChipsRecovered,
        unsoldChipsRecovered: result.unsoldChipsRecovered,
        chipsLeft: result.chipsLeft
      }
    });

    return result;
  }

  /**
   * Confirma que el cajero pagó el cobro pendiente de su última liquidación.
   * `amount` es lo que se recibió (por defecto, todo lo pendiente); si es
   * menos, la diferencia queda como deuda.
   */
  async confirmSettlementCollection(
    requesterId: string,
    settlementId: string,
    data: { amount?: number; paymentReference?: string }
  ): Promise<CashierSettlement> {
    await this.assertOwner(requesterId);
    const settlement = await this.getSettlementInOwnerTree(requesterId, settlementId);

    if (settlement.status === SettlementStatus.CANCELED) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación está cancelada');
    }
    if (data.amount !== undefined && data.amount <= 0) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'El cobro tiene que ser mayor a cero');
    }

    let received = 0;
    const updated = await sequelize.transaction(async (t: Transaction) => {
      const current = await cashierAccountsRepository.findSettlementById(settlementId, t);
      if (!current || current.status === SettlementStatus.CANCELED) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación está cancelada');
      }
      const last = await cashierAccountsRepository.findLastSettlement(current.cashierId, t);
      if (!last || last.id !== current.id) {
        throw new AppError(
          409,
          ErrorCode.ALREADY_EXISTS,
          'Solo se puede confirmar el cobro de la última liquidación del cajero: lo pendiente de las anteriores ya pasó como deuda.'
        );
      }
      const pending = roundMoney(current.pendingCollection ?? 0);
      if (pending <= 0) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación no tiene cobros pendientes');
      }

      received = roundMoney(data.amount ?? pending);
      const collected = roundMoney((current.collected ?? 0) + received);
      const debtCarried = roundMoney((current.totalDue ?? 0) - collected);
      const status = statusForCollection(collected, debtCarried);
      const now = new Date();

      const pendingRows = (await cashierAccountsRepository.findSettlementCollections(settlementId, t))
        .filter(row =>
          row.kind === CashierCollectionKind.SETTLEMENT &&
          row.status === CashierCollectionStatus.PENDING
        );
      const [first, ...rest] = pendingRows;
      const confirmation = {
        status: CashierCollectionStatus.CONFIRMED,
        amount: received,
        confirmedBy: requesterId,
        confirmedAt: now,
        ...(data.paymentReference?.trim() ? { paymentReference: data.paymentReference.trim() } : {})
      };
      if (first) {
        await cashierAccountsRepository.updateCollection(first.id, confirmation, t);
        for (const row of rest) {
          await cashierAccountsRepository.updateCollection(
            row.id,
            { status: CashierCollectionStatus.CANCELED },
            t
          );
        }
      } else {
        await cashierAccountsRepository.createCollection(
          {
            settlementId,
            cashierId: current.cashierId,
            kind: CashierCollectionKind.SETTLEMENT,
            createdBy: requesterId,
            ...confirmation
          },
          t
        );
      }

      return cashierAccountsRepository.updateSettlementCollection(
        settlementId,
        {
          collected,
          debtCarried,
          status,
          pendingCollection: 0,
          paidBy: requesterId,
          paidAt: status === SettlementStatus.PAID ? now : null,
          paymentReference: data.paymentReference?.trim() || null
        },
        t
      );
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.confirm-collection',
      entityType: 'chips',
      entityId: settlementId,
      oldValues: {
        collected: settlement.collected,
        pendingCollection: settlement.pendingCollection,
        debtCarried: settlement.debtCarried
      },
      newValues: { received, collected: updated.collected, debtCarried: updated.debtCarried }
    });

    return updated;
  }

  /**
   * Cobro a cuenta: el owner registra lo que el cajero le va pagando en la
   * semana. Se descuenta en la próxima liquidación.
   */
  async createOnAccountCollection(
    requesterId: string,
    cashierId: string,
    data: { amount: number; paymentReference?: string; notes?: string }
  ): Promise<CashierCollection> {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);
    if (!(data.amount > 0)) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'El cobro tiene que ser mayor a cero');
    }

    const now = new Date();
    const collection = await cashierAccountsRepository.createCollection({
      settlementId: null,
      cashierId,
      kind: CashierCollectionKind.ON_ACCOUNT,
      status: CashierCollectionStatus.CONFIRMED,
      amount: roundMoney(data.amount),
      paymentReference: data.paymentReference?.trim() || null,
      notes: data.notes?.trim() || null,
      createdBy: requesterId,
      confirmedBy: requesterId,
      confirmedAt: now
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.collection.create',
      entityType: 'chips',
      entityId: collection.id,
      newValues: { cashierId, amount: collection.amount, kind: collection.kind }
    });

    return collection;
  }

  /** Cobros a cuenta de un cajero que todavía no entraron en una liquidación. */
  async listOnAccountCollections(requesterId: string, cashierId: string): Promise<CashierCollection[]> {
    await this.assertOwner(requesterId);
    await this.getCashierInOwnerTree(requesterId, cashierId);
    const rows = await cashierAccountsRepository.findUnappliedOnAccountCollections(cashierId);
    return [...rows].reverse();
  }

  /** Anula un cobro a cuenta cargado por error. Solo si todavía no se liquidó. */
  async cancelOnAccountCollection(requesterId: string, collectionId: string): Promise<CashierCollection> {
    await this.assertOwner(requesterId);
    const collection = await cashierAccountsRepository.findCollectionById(collectionId);
    if (!collection) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Collection not found');
    }
    await this.getCashierInOwnerTree(requesterId, collection.cashierId);
    if (
      collection.kind !== CashierCollectionKind.ON_ACCOUNT ||
      collection.status !== CashierCollectionStatus.CONFIRMED
    ) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Solo se pueden anular cobros a cuenta');
    }
    if (collection.settlementId) {
      throw new AppError(
        409,
        ErrorCode.ALREADY_EXISTS,
        'El cobro ya se descontó en una liquidación: cancelá la liquidación primero.'
      );
    }

    const canceled = await cashierAccountsRepository.updateCollection(collectionId, {
      status: CashierCollectionStatus.CANCELED
    });

    writeAudit({
      requesterId,
      action: 'cashier-accounts.collection.cancel',
      entityType: 'chips',
      entityId: collectionId,
      oldValues: { status: collection.status },
      newValues: { status: canceled.status, amount: collection.amount }
    });

    return canceled;
  }

  /**
   * Cancela una liquidación. En el modelo nuevo solo se puede cancelar la
   * última del cajero, y se le devuelven las fichas que se le retiraron.
   */
  async cancelSettlement(
    requesterId: string,
    settlementId: string,
    reason?: string
  ): Promise<CashierSettlement> {
    await this.assertOwner(requesterId);
    const settlement = await this.getSettlementInOwnerTree(requesterId, settlementId);

    if (settlement.status === SettlementStatus.CANCELED) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'La liquidación ya está cancelada');
    }

    const cancelNote = reason?.trim() ? `[Cancelada] ${reason.trim()}` : null;
    const notes = [settlement.notes, cancelNote].filter(Boolean).join('\n') || undefined;

    let canceled: CashierSettlement;
    let chipsReturned = 0;

    if (isLegacySettlement(settlement)) {
      if (settlement.status === SettlementStatus.PAID) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'No se puede cancelar una liquidación pagada');
      }
      canceled = await cashierAccountsRepository.markSettlementCanceled(settlementId, notes);
    } else {
      canceled = await sequelize.transaction(async (t: Transaction) => {
        const balance = await balancesRepository.findByUserIdWithLock(settlement.cashierId, t);
        if (!balance) {
          throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier balance not found');
        }

        const last = await cashierAccountsRepository.findLastSettlement(settlement.cashierId, t);
        if (!last || last.id !== settlement.id) {
          throw new AppError(
            409,
            ErrorCode.ALREADY_EXISTS,
            'Solo se puede cancelar la última liquidación del cajero.'
          );
        }

        const movements = await cashierAccountsRepository.findSettlementChipMovements(
          settlementId,
          t
        );
        const recovered = movements
          .filter(movement =>
            movement.key === settlementMovementKey(settlementId, 'prizes') ||
            movement.key === settlementMovementKey(settlementId, 'unsold')
          )
          .reduce((sum, movement) => sum - movement.amount, 0);
        chipsReturned = roundMoney(recovered);

        if (chipsReturned > 0) {
          await chipMovementsRepository.create(
            {
              userId: settlement.cashierId,
              relatedUserId: requesterId,
              type: ChipMovementType.ADJUSTMENT,
              amount: chipsReturned,
              description: 'Anulación de liquidación: devolución de fichas retiradas',
              previousBalance: balance.chipBalance,
              newBalance: roundMoney(balance.chipBalance + chipsReturned),
              idempotencyKey: settlementMovementKey(settlementId, 'reversal')
            },
            t
          );
          await balancesRepository.atomicIncrement(settlement.cashierId, chipsReturned, t);
        }

        await cashierAccountsRepository.releaseSettlementCollections(settlementId, t);

        // La liquidación anterior vuelve a ser la última: su cobro pendiente
        // (vencido al liquidar esta) vuelve a estar pendiente.
        const previous = await cashierAccountsRepository.findPreviousSettlement(settlement, t);
        if (previous) {
          const expired = (await cashierAccountsRepository.findSettlementCollections(previous.id, t))
            .filter(row =>
              row.kind === CashierCollectionKind.SETTLEMENT &&
              row.status === CashierCollectionStatus.EXPIRED
            );
          if (expired.length > 0) {
            await cashierAccountsRepository.setPendingCollectionsStatus(
              previous.id,
              CashierCollectionStatus.EXPIRED,
              CashierCollectionStatus.PENDING,
              t
            );
            await cashierAccountsRepository.updateSettlementCollection(
              previous.id,
              {
                collected: previous.collected ?? 0,
                debtCarried: previous.debtCarried ?? 0,
                status: previous.status,
                pendingCollection: sumAmounts(expired)
              },
              t
            );
          }
        }

        return cashierAccountsRepository.markSettlementCanceled(settlementId, notes, t);
      });
    }

    writeAudit({
      requesterId,
      action: 'cashier-accounts.settlement.cancel',
      entityType: 'chips',
      entityId: settlementId,
      oldValues: { status: settlement.status },
      newValues: { status: canceled.status, reason: reason ?? null, chipsReturned }
    });

    return canceled;
  }

  async listSettlements(
    requesterId: string,
    filters: {
      page?: number;
      limit?: number;
      cashierId?: string;
      status?: SettlementStatus;
      search?: string;
    } = {}
  ) {
    await this.assertOwner(requesterId);
    const cashiers = await this.getOwnerCashiers(requesterId);
    const cashierIds = cashiers.map(cashier => cashier.id);

    if (filters.cashierId && !cashierIds.includes(filters.cashierId)) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier not found');
    }

    return cashierAccountsRepository.findSettlements({
      cashierIds,
      cashierId: filters.cashierId,
      status: filters.status,
      search: filters.search?.trim() || undefined,
      page: filters.page,
      limit: filters.limit
    });
  }

  async getSettlementReceipt(requesterId: string, settlementId: string) {
    await this.assertOwner(requesterId);
    const settlement = await this.getSettlementInOwnerTree(requesterId, settlementId);
    return this.buildSettlementReceipt(settlement);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vista del cajero (solo lectura de sus propias liquidaciones)
  // ─────────────────────────────────────────────────────────────────────────

  async listOwnSettlements(
    requesterId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<CashierOwnSettlementsResult> {
    await this.assertCashier(requesterId);
    const [result, onAccountCollections] = await Promise.all([
      cashierAccountsRepository.findSettlements({
        cashierId: requesterId,
        page: options.page,
        limit: options.limit
      }),
      cashierAccountsRepository.findUnappliedOnAccountCollections(requesterId)
    ]);
    return {
      settlements: result.settlements,
      total: result.total,
      page: result.page,
      limit: result.limit,
      onAccountCollections: [...onAccountCollections].reverse()
    };
  }

  async getOwnSettlementReceipt(requesterId: string, settlementId: string) {
    await this.assertCashier(requesterId);
    const settlement = await cashierAccountsRepository.findSettlementById(settlementId);
    if (!settlement || settlement.cashierId !== requesterId) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Settlement not found');
    }
    return this.buildSettlementReceipt(settlement);
  }

  private async buildSettlementReceipt(settlement: CashierSettlement) {
    const cashier = await usersRepository.findById(settlement.cashierId);
    if (!cashier) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier not found');
    }

    const buffer = generateSettlementReceiptPdf({
      ...settlement,
      cashierUsername: cashier.username
    });

    const safeUsername = cashier.username.replace(/[^a-zA-Z0-9_-]/g, '-');
    return {
      buffer,
      filename: `liquidacion-${safeUsername}-${settlement.id.slice(0, 8)}.pdf`
    };
  }

  async getPeriodSummaryReceipt(requesterId: string, periodEnd: Date | string) {
    const result = await this.getPeriodAccounts(requesterId, periodEnd);
    const stamp = (date: Date) => date.toISOString().slice(0, 10);
    return {
      buffer: generatePeriodSummaryPdf(result),
      filename: `cuenta-corriente-al-${stamp(result.periodEnd)}.pdf`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cuenta del owner
  // ─────────────────────────────────────────────────────────────────────────

  /** Resumen PDF de la cuenta del owner para un rango. */
  async getOwnerAccountReceipt(
    requesterId: string,
    periodStart: Date | string,
    periodEnd: Date | string
  ) {
    const owner = await this.assertOwner(requesterId);
    const summary = await this.getOwnerAccount(requesterId, periodStart, periodEnd);
    const stamp = (date: Date) => date.toISOString().slice(0, 10);
    return {
      buffer: generateOwnerAccountPdf({ ...summary, ownerUsername: owner.username }),
      filename: `cuenta-del-owner-${stamp(summary.periodStart)}-al-${stamp(summary.periodEnd)}.pdf`
    };
  }

  async getOwnerAccount(
    requesterId: string,
    periodStart: Date | string,
    periodEnd: Date | string
  ): Promise<OwnerAccountSummary> {
    await this.assertOwner(requesterId);
    const start = this.normalizeDate(periodStart);
    const end = this.normalizeDate(periodEnd);
    this.assertValidPeriod(start, end);

    const descendants = await usersRepository.findDescendants(requesterId);
    const cashiers = descendants
      .filter(user => user.role === UserRole.CASHIER)
      .sort((a, b) => a.username.localeCompare(b.username));
    const players = descendants.filter(user => user.role === UserRole.PLAYER);
    const cashierIds = cashiers.map(cashier => cashier.id);
    const usernameById = new Map(cashiers.map(cashier => [cashier.id, cashier.username]));

    const [settlements, collections, summaries, playerBalances] = await Promise.all([
      cashierAccountsRepository.findSettlementsClosedInRange(cashierIds, start, end),
      cashierAccountsRepository.findCollectionsInRange(cashierIds, start, end),
      this.buildSummaries(cashiers),
      players.length > 0
        ? balancesRepository.findByUserIds(players.map(player => player.id))
        : Promise.resolve([])
    ]);

    const settled: OwnerAccountTotals = {
      settlements: 0,
      totalSales: 0,
      commission: 0,
      subtotal: 0,
      prizes: 0,
      profit: 0,
      collected: 0,
      cashFlow: 0,
      chipsDelivered: 0,
      chipsRecovered: 0
    };
    const movements: OwnerAccountMovement[] = [];

    for (const settlement of settlements) {
      const commission = settlementCommission(settlement);
      const subtotal = settlementSubtotal(settlement);
      const prizes = settlement.totalPrizesPaid;
      settled.settlements += 1;
      settled.totalSales = roundMoney(settled.totalSales + settlement.totalSales);
      settled.commission = roundMoney(settled.commission + commission);
      settled.subtotal = roundMoney(settled.subtotal + subtotal);
      settled.prizes = roundMoney(settled.prizes + prizes);
      settled.collected = roundMoney(settled.collected + (settlement.collected ?? 0));
      settled.chipsDelivered = roundMoney(settled.chipsDelivered + (settlement.chipsDelivered ?? 0));
      settled.chipsRecovered = roundMoney(
        settled.chipsRecovered +
          (settlement.prizeChipsRecovered ?? 0) +
          (settlement.unsoldChipsRecovered ?? 0)
      );

      const period = `${this.shortDate(settlement.periodStart)} al ${this.shortDate(settlement.periodEnd)}`;
      movements.push({
        id: `${settlement.id}:settlement`,
        kind: 'SETTLEMENT',
        cashierId: settlement.cashierId,
        cashierUsername: settlement.cashierUsername,
        settlementId: settlement.id,
        cash: 0,
        profit: subtotal,
        description: `Liquidación ${period}: venta ${settlement.totalSales} − comisión ${commission}`,
        createdAt: settlement.createdAt
      });
      if (prizes > 0) {
        movements.push({
          id: `${settlement.id}:prizes`,
          kind: 'PRIZES',
          cashierId: settlement.cashierId,
          cashierUsername: settlement.cashierUsername,
          settlementId: settlement.id,
          cash: -prizes,
          profit: -prizes,
          description: `Premios pagados a jugadores (${period})`,
          createdAt: settlement.createdAt
        });
      }
    }
    settled.profit = roundMoney(settled.subtotal - settled.prizes);
    settled.cashFlow = roundMoney(settled.collected - settled.prizes);

    let collectedInRange = 0;
    for (const collection of collections) {
      collectedInRange = roundMoney(collectedInRange + collection.amount);
      movements.push({
        id: `${collection.id}:collection`,
        kind: 'COLLECTION',
        cashierId: collection.cashierId,
        cashierUsername: usernameById.get(collection.cashierId) ?? '',
        settlementId: collection.settlementId,
        cash: collection.amount,
        profit: 0,
        description: `${collection.kind === CashierCollectionKind.ON_ACCOUNT ? 'Cobro a cuenta' : 'Cobro'} al cajero${
          collection.paymentReference ? ` · ${collection.paymentReference}` : ''
        }`,
        createdAt: collection.confirmedAt ?? collection.createdAt
      });
    }

    movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totals = this.sumSummaries(summaries);
    return {
      periodStart: start,
      periodEnd: end,
      settled,
      collectedInRange,
      current: {
        cashierDebt: totals.debt,
        openSubtotal: totals.openSubtotal,
        openSales: roundMoney(summaries.reduce((sum, s) => sum + s.openSales, 0)),
        openPrizes: roundMoney(summaries.reduce((sum, s) => sum + s.openPrizes, 0)),
        cashierChips: totals.chipBalance,
        playerChips: roundMoney(playerBalances.reduce((sum, b) => sum + b.chipBalance, 0))
      },
      movements
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cálculos
  // ─────────────────────────────────────────────────────────────────────────

  private async buildLivePreview(
    cashier: User,
    periodStart: Date,
    periodEnd: Date,
    lastSettlement: CashierSettlement | null
  ): Promise<CashierSettlementPreview> {
    const [compensation, flows, balance, onAccount] = await Promise.all([
      cashierAccountsRepository.findCompensationModeForPeriod(cashier.id, periodStart, periodEnd),
      cashierAccountsRepository.getPeriodFlows(cashier.id, periodStart, periodEnd),
      balancesRepository.findByUserId(cashier.id),
      cashierAccountsRepository.findUnappliedOnAccountCollections(cashier.id, periodEnd)
    ]);

    return this.computePreview({
      cashier,
      periodStart,
      periodEnd,
      compensation,
      flows,
      lastSettlement,
      chipBalance: balance?.chipBalance ?? 0,
      onAccountCollected: sumAmounts(onAccount)
    });
  }

  /**
   * Inicio del período a liquidar: justo después de la última liquidación; si
   * nunca se liquidó, el primer movimiento del cajero (o el día del corte si
   * no tiene movimientos).
   */
  private async resolvePeriodStart(
    cashierId: string,
    cutoff: Date,
    lastSettlement: CashierSettlement | null,
    transaction?: Transaction
  ): Promise<Date> {
    if (lastSettlement) {
      return new Date(lastSettlement.periodEnd.getTime() + 1);
    }
    const first = await cashierAccountsRepository.findFirstMovementAt(cashierId, transaction);
    if (first && first < cutoff) return first;
    const startOfDay = new Date(cutoff);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay < cutoff ? startOfDay : new Date(cutoff.getTime() - 1);
  }

  /** Fecha de corte válida y nunca posterior a ahora. */
  private normalizeCutoff(value: Date | string): Date {
    const cutoff = this.normalizeDate(value);
    if (Number.isNaN(cutoff.getTime())) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Invalid period dates');
    }
    const now = new Date();
    return cutoff > now ? now : cutoff;
  }

  /**
   * comisión = venta × %; subtotal = venta − comisión;
   * total = saldo anterior + subtotal; a cobrar = total − cobros a cuenta;
   * fichas de premios a retirar = premios
   * (sin superar el saldo del cajero); no vendidas = saldo − fichas de premios.
   */
  computePreview(inputs: PreviewInputs): CashierSettlementPreview {
    const { cashier, periodStart, periodEnd, compensation, flows, lastSettlement } = inputs;

    const totalSales = roundMoney(flows.totalSales);
    const totalPrizes = roundMoney(flows.totalPrizes);
    const chipsDelivered = roundMoney(flows.chipsDelivered);
    const commission = this.calculateCommission(totalSales, compensation?.percentage ?? null);
    const subtotal = roundMoney(totalSales - commission);
    const previousDebt = roundMoney(lastSettlement?.debtCarried ?? 0);
    const totalDue = roundMoney(previousDebt + subtotal);
    const onAccountCollected = roundMoney(inputs.onAccountCollected ?? 0);
    const chipBalance = roundMoney(Math.max(inputs.chipBalance, 0));
    const prizeChipsToRecover = roundMoney(Math.min(totalPrizes, chipBalance));
    const unsoldChips = roundMoney(chipBalance - prizeChipsToRecover);

    const unsettledSince =
      lastSettlement &&
      periodStart.getTime() - lastSettlement.periodEnd.getTime() > CONTIGUITY_TOLERANCE_MS
        ? lastSettlement.periodEnd
        : null;

    return {
      cashierId: cashier.id,
      cashierUsername: cashier.username,
      periodStart,
      periodEnd,
      compensation: compensation
        ? {
            type: compensation.type,
            percentage: compensation.percentage ?? null,
            activeFrom: compensation.activeFrom
          }
        : null,
      chipsDelivered,
      totalSales,
      totalPrizes,
      commission,
      subtotal,
      previousDebt,
      totalDue,
      onAccountCollected,
      amountDue: roundMoney(totalDue - onAccountCollected),
      chipBalance,
      prizeChipsToRecover,
      unsoldChips,
      profit: roundMoney(subtotal - totalPrizes),
      payableAmount: commission,
      lastSettlementEnd: lastSettlement?.periodEnd ?? null,
      unsettledSince
    };
  }

  private previewFromSettlement(
    cashier: User,
    settlement: CashierSettlement
  ): CashierSettlementPreview {
    const commission = settlementCommission(settlement);
    const subtotal = settlementSubtotal(settlement);
    const totalDue = settlement.totalDue ?? subtotal;
    const onAccountCollected = settlement.onAccountCollected ?? 0;
    return {
      cashierId: cashier.id,
      cashierUsername: cashier.username,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      compensation: settlement.compensationType
        ? {
            type: settlement.compensationType,
            percentage: settlement.percentage ?? null,
            activeFrom: settlement.periodStart
          }
        : null,
      chipsDelivered: settlement.chipsDelivered ?? 0,
      totalSales: settlement.totalSales,
      totalPrizes: settlement.totalPrizesPaid,
      commission,
      subtotal,
      previousDebt: settlement.previousDebt ?? 0,
      totalDue,
      onAccountCollected,
      amountDue: roundMoney(totalDue - onAccountCollected),
      chipBalance: settlement.chipBalanceBefore ?? 0,
      prizeChipsToRecover: settlement.prizeChipsRecovered ?? 0,
      unsoldChips: settlement.unsoldChips ?? 0,
      profit: roundMoney(subtotal - settlement.totalPrizesPaid),
      payableAmount: commission,
      lastSettlementEnd: null,
      unsettledSince: null
    };
  }

  private sumPeriodAccounts(accounts: CashierPeriodAccount[]): CashierPeriodAccountTotals {
    const totals: CashierPeriodAccountTotals = {
      chipsDelivered: 0,
      totalSales: 0,
      totalPrizes: 0,
      commission: 0,
      subtotal: 0,
      previousDebt: 0,
      totalDue: 0,
      onAccountCollected: 0,
      amountDue: 0,
      collected: 0,
      debtCarried: 0,
      chipBalance: 0,
      unsoldChips: 0,
      chipsLeft: 0
    };
    const add = (key: keyof CashierPeriodAccountTotals, value: number) => {
      totals[key] = roundMoney(totals[key] + value);
    };

    for (const { preview, settlement } of accounts) {
      // Las filas sin liquidar suman con los valores por defecto de la
      // liquidación: cobro de lo que queda y todas las no vendidas.
      const collected = settlement
        ? settlementCollectionAmount(settlement)
        : Math.max(preview.amountDue, 0);
      const chipsLeft = settlement ? settlement.chipsLeft ?? 0 : preview.unsoldChips;
      const debtCarried = settlement
        ? settlement.debtCarried ?? 0
        : roundMoney(preview.amountDue - collected);

      add('chipsDelivered', preview.chipsDelivered);
      add('totalSales', preview.totalSales);
      add('totalPrizes', preview.totalPrizes);
      add('commission', preview.commission);
      add('subtotal', preview.subtotal);
      add('previousDebt', preview.previousDebt);
      add('totalDue', preview.totalDue);
      add('onAccountCollected', preview.onAccountCollected);
      add('amountDue', preview.amountDue);
      add('collected', collected);
      add('debtCarried', debtCarried);
      add('chipBalance', preview.chipBalance);
      add('unsoldChips', preview.unsoldChips);
      add('chipsLeft', chipsLeft);
    }

    return totals;
  }

  private async buildSummaries(cashiers: User[]): Promise<CashierAccountSummary[]> {
    if (cashiers.length === 0) return [];
    const ids = cashiers.map(cashier => cashier.id);

    const [modes, settlements, totals, balances, onAccountTotals] = await Promise.all([
      cashierAccountsRepository.findCompensationModes(ids),
      cashierAccountsRepository.findNonCanceledSettlements(ids),
      cashierAccountsRepository.getMovementTotals(ids),
      balancesRepository.findByUserIds(ids),
      cashierAccountsRepository.getUnappliedOnAccountTotals(ids)
    ]);

    const now = new Date();
    const balanceByCashier = new Map(balances.map(balance => [balance.userId, balance.chipBalance]));
    const modesByCashier = this.groupByCashier(mode => mode.cashierId, modes);
    const settlementsByCashier = this.groupByCashier(settlement => settlement.cashierId, settlements);

    return cashiers.map(cashier => {
      const cashierModes = modesByCashier.get(cashier.id) ?? [];
      const activeMode = cashierModes.find(mode =>
        mode.activeFrom <= now && (!mode.activeTo || mode.activeTo > now)
      ) ?? null;
      // Ordenadas por fin de período descendente: la primera es la última.
      const cashierSettlements = [...(settlementsByCashier.get(cashier.id) ?? [])].sort(
        (a, b) => b.periodEnd.getTime() - a.periodEnd.getTime()
      );
      const lastSettlement = cashierSettlements[0] ?? null;
      const movementTotals = totals.get(cashier.id) ?? { totalSales: 0, totalPrizes: 0 };

      const totalSales = roundMoney(movementTotals.totalSales);
      const totalPrizes = roundMoney(movementTotals.totalPrizes);

      const settledSales = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + settlement.totalSales, 0)
      );
      const settledPrizes = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + settlement.totalPrizesPaid, 0)
      );
      const settledCommission = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + settlementCommission(settlement), 0)
      );
      const totalCollected = roundMoney(
        cashierSettlements.reduce((sum, settlement) => sum + (settlement.collected ?? 0), 0)
      );

      const openSales = roundMoney(Math.max(0, totalSales - settledSales));
      const openPrizes = roundMoney(Math.max(0, totalPrizes - settledPrizes));
      const openCommission = this.calculateCommission(openSales, activeMode?.percentage ?? null);
      const openSubtotal = roundMoney(openSales - openCommission);
      const debt = roundMoney(lastSettlement?.debtCarried ?? 0);
      const onAccountCollected = roundMoney(onAccountTotals.get(cashier.id) ?? 0);

      return {
        cashierId: cashier.id,
        username: cashier.username,
        email: cashier.email,
        firstName: cashier.firstName,
        lastName: cashier.lastName,
        status: cashier.status,
        chipBalance: balanceByCashier.get(cashier.id) ?? 0,
        compensation: activeMode
          ? {
              type: activeMode.type,
              percentage: activeMode.percentage ?? null,
              activeFrom: activeMode.activeFrom
            }
          : null,
        totalSales,
        totalPrizes,
        totalCommission: roundMoney(settledCommission + openCommission),
        totalCollected,
        openSales,
        openPrizes,
        openCommission,
        openSubtotal,
        debt,
        onAccountCollected,
        balanceDue: roundMoney(debt + openSubtotal - onAccountCollected),
        lastSettlementAt: lastSettlement?.createdAt ?? null,
        lastSettlementEnd: lastSettlement?.periodEnd ?? null
      };
    }).sort((a, b) => a.username.localeCompare(b.username));
  }

  private sumSummaries(summaries: CashierAccountSummary[]): CashierAccountsSummary {
    return summaries.reduce<CashierAccountsSummary>(
      (acc, account) => ({
        totalCashiers: acc.totalCashiers + 1,
        totalSales: roundMoney(acc.totalSales + account.totalSales),
        totalPrizes: roundMoney(acc.totalPrizes + account.totalPrizes),
        totalCommission: roundMoney(acc.totalCommission + account.totalCommission),
        totalCollected: roundMoney(acc.totalCollected + account.totalCollected),
        openSubtotal: roundMoney(acc.openSubtotal + account.openSubtotal),
        debt: roundMoney(acc.debt + account.debt),
        onAccountCollected: roundMoney(acc.onAccountCollected + account.onAccountCollected),
        balanceDue: roundMoney(acc.balanceDue + account.balanceDue),
        chipBalance: roundMoney(acc.chipBalance + account.chipBalance)
      }),
      {
        totalCashiers: 0,
        totalSales: 0,
        totalPrizes: 0,
        totalCommission: 0,
        totalCollected: 0,
        openSubtotal: 0,
        debt: 0,
        onAccountCollected: 0,
        balanceDue: 0,
        chipBalance: 0
      }
    );
  }

  /**
   * Arma la cuenta corriente del cajero: movimientos de fichas y de dinero
   * (subtotal de cada liquidación y cobros), del más reciente al más viejo.
   */
  private buildLedger(
    cashierId: string,
    chipRows: LedgerChipRow[],
    settlements: CashierSettlement[],
    collections: CashierCollection[]
  ): CashierAccountMovement[] {
    const activeSettlements = new Map(
      settlements
        .filter(settlement => settlement.status !== SettlementStatus.CANCELED)
        .map(settlement => [settlement.id, settlement])
    );
    const entries: CashierAccountMovement[] = [];

    for (const row of chipRows) {
      const amount = parseFloat(String(row.amount)) || 0;
      const key = row.idempotency_key ?? '';
      const settlementMatch = /^settlement:([^:]+):(\w+)$/.exec(key);
      const own = row.user_id === cashierId;

      let kind: CashierLedgerKind = 'OTHER';
      let chips = own ? amount : -amount;

      if (own) {
        if (row.type === ChipMovementType.SELL_TO_PLAYER) kind = 'CHIPS_DELIVERED';
        else if (row.type === ChipMovementType.WITHDRAWAL) kind = 'CHIPS_RETURNED';
        else if (settlementMatch?.[2] === 'prizes') kind = 'PRIZE_CHIPS_RECOVERED';
        else if (settlementMatch?.[2] === 'unsold') kind = 'UNSOLD_CHIPS_RECOVERED';
        else if (settlementMatch?.[2] === 'reversal') kind = 'SETTLEMENT_REVERSAL';
      } else {
        // Movimiento de un jugador operado por el cajero: el monto está
        // guardado desde el lado del jugador, así que el efecto en el cajero
        // es el opuesto.
        chips = -amount;
        if (row.type === ChipMovementType.SELL_TO_PLAYER) kind = 'SALE';
        else if (row.type === ChipMovementType.PRIZE) kind = 'PRIZE';
        else kind = 'PLAYER_RETURN';
      }

      entries.push({
        id: row.id,
        kind,
        type: row.type,
        playerId: own ? null : row.user_id,
        playerUsername: row.username,
        chips: roundMoney(chips),
        money: 0,
        amount,
        description: row.description,
        settlementId: settlementMatch?.[1] ?? null,
        createdAt: new Date(row.created_at)
      });
    }

    for (const settlement of activeSettlements.values()) {
      if (isLegacySettlement(settlement)) continue;
      entries.push({
        id: `${settlement.id}:settlement`,
        kind: 'SETTLEMENT',
        type: null,
        playerId: null,
        playerUsername: null,
        chips: 0,
        money: settlementSubtotal(settlement),
        amount: settlementSubtotal(settlement),
        description:
          `Liquidación ${this.shortDate(settlement.periodStart)} al ${this.shortDate(settlement.periodEnd)}: ` +
          `venta ${settlement.totalSales} − comisión ${settlementCommission(settlement)}`,
        settlementId: settlement.id,
        createdAt: settlement.createdAt
      });
    }

    for (const collection of collections) {
      if (collection.status !== CashierCollectionStatus.CONFIRMED) continue;
      if (collection.settlementId && !activeSettlements.has(collection.settlementId)) continue;
      const onAccount = collection.kind === CashierCollectionKind.ON_ACCOUNT;
      const label = onAccount ? 'Cobro a cuenta' : 'Cobro';
      entries.push({
        id: `${collection.id}:collection`,
        kind: 'COLLECTION',
        type: null,
        playerId: null,
        playerUsername: null,
        chips: 0,
        money: -collection.amount,
        amount: collection.amount,
        description: collection.paymentReference
          ? `${label} · ${collection.paymentReference}`
          : label,
        settlementId: collection.settlementId,
        createdAt: collection.confirmedAt ?? collection.createdAt
      });
    }

    return entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, LEDGER_LIMIT);
  }

  private calculateCommission(baseAmount: number, percentage: number | null | undefined): number {
    if (!percentage || percentage <= 0 || baseAmount <= 0) return 0;
    return roundMoney((baseAmount * percentage) / 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private shortDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: config.timezone
    }).format(date);
  }

  private normalizeDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private assertValidPeriod(periodStart: Date, periodEnd: Date): void {
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Invalid period dates');
    }
    if (periodEnd <= periodStart) {
      throw new AppError(400, ErrorCode.INVALID_INPUT, 'Period end must be after period start');
    }
  }

  private async assertOwner(requesterId: string): Promise<User> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }
    if (requester.role !== UserRole.OWNER) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Solo el propietario puede gestionar las cuentas de cajeros'
      );
    }
    return requester;
  }

  private async assertCashier(requesterId: string): Promise<User> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }
    if (requester.role !== UserRole.CASHIER) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Solo los cajeros tienen liquidaciones propias');
    }
    return requester;
  }

  private async getOwnerCashiers(ownerId: string): Promise<User[]> {
    const descendants = await usersRepository.findDescendants(ownerId);
    return descendants
      .filter(user => user.role === UserRole.CASHIER)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  private async getCashierInOwnerTree(ownerId: string, cashierId: string): Promise<User> {
    const cashier = await usersRepository.findById(cashierId);
    if (!cashier || cashier.role !== UserRole.CASHIER) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Cashier not found');
    }

    const inTree = await usersRepository.isDescendant(ownerId, cashierId);
    if (!inTree) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Cashier is not in your hierarchy');
    }
    return cashier;
  }

  private async getSettlementInOwnerTree(
    ownerId: string,
    settlementId: string
  ): Promise<CashierSettlement> {
    const settlement = await cashierAccountsRepository.findSettlementById(settlementId);
    if (!settlement) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Settlement not found');
    }
    await this.getCashierInOwnerTree(ownerId, settlement.cashierId);
    return settlement;
  }

  private matchesSearch(cashier: User, search: string): boolean {
    return [
      cashier.username,
      cashier.email,
      cashier.firstName,
      cashier.lastName
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(search));
  }

  private groupByCashier<T>(key: (item: T) => string, items: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const cashierId = key(item);
      const group = map.get(cashierId);
      if (group) group.push(item);
      else map.set(cashierId, [item]);
    }
    return map;
  }
}

export const cashierAccountsDomain = new CashierAccountsDomain();
