import { CompensationType, SettlementStatus } from 'helper';
import type { OwnerAccountMovement, OwnerAccountSummary } from 'helper';
import {
  generateOwnerAccountPdf,
  generatePeriodSummaryPdf,
  generateSettlementReceiptPdf
} from '../../src/utils/settlement-receipt.utils';

const baseSettlement = {
  id: '12345678-1234-1234-1234-123456789012',
  cashierId: 'cashier-1',
  cashierUsername: 'cajero1',
  periodStart: new Date('2026-11-15T03:00:00.000Z'),
  periodEnd: new Date('2026-11-22T02:59:59.999Z'),
  totalSales: 900,
  totalPrizesPaid: 50,
  profit: 670,
  payableAmount: 180,
  status: SettlementStatus.PARTIALLY_PAID,
  compensationType: CompensationType.PERCENTAGE,
  percentage: 20,
  notes: null,
  createdBy: 'owner-1',
  paidBy: 'owner-1',
  paymentReference: null,
  createdAt: new Date('2026-11-21T23:53:07.991Z'),
  paidAt: null,
  commission: 180,
  subtotal: 720,
  previousDebt: 0,
  totalDue: 720,
  collected: 700,
  debtCarried: 20,
  chipsDelivered: 1000,
  chipBalanceBefore: 150,
  prizeChipsRecovered: 50,
  unsoldChips: 100,
  chipsLeft: 100,
  unsoldChipsRecovered: 0
};

describe('generateSettlementReceiptPdf', () => {
  it('genera el comprobante con venta, comisión, subtotal, cobro y fichas', () => {
    const pdf = generateSettlementReceiptPdf(baseSettlement);

    expect(pdf.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');

    const text = pdf.toString('latin1');
    expect(text).toContain('Liquidacion de cajero');
    expect(text).toContain('cajero1');
    expect(text).toContain('Venta de fichas');
    expect(text).toContain('900,00');
    expect(text).toContain('\\(20%\\)');
    expect(text).toContain('720,00');
    expect(text).toContain('Queda debiendo');
    expect(text).toContain('No vendidas \\(quedan al cajero\\)');
    expect(text).toContain('COBRO PARCIAL');
  });

  it('muestra la comisión en liquidaciones del modelo anterior', () => {
    const pdf = generateSettlementReceiptPdf({
      ...baseSettlement,
      status: SettlementStatus.PAID,
      commission: null,
      subtotal: null,
      previousDebt: null,
      totalDue: null,
      collected: null,
      debtCarried: null
    });

    const text = pdf.toString('latin1');
    expect(text).toContain('Comision \\(modelo anterior\\)');
    expect(text).toContain('COBRADA');
  });
});

describe('generatePeriodSummaryPdf', () => {
  it('genera el resumen del período con una fila por cajero y totales', () => {
    const pdf = generatePeriodSummaryPdf({
      periodStart: baseSettlement.periodStart,
      periodEnd: baseSettlement.periodEnd,
      accounts: [
        {
          settlement: baseSettlement,
          preview: {
            cashierId: 'cashier-1',
            cashierUsername: 'cajero1',
            periodStart: baseSettlement.periodStart,
            periodEnd: baseSettlement.periodEnd,
            compensation: null,
            chipsDelivered: 1000,
            totalSales: 900,
            totalPrizes: 50,
            commission: 180,
            subtotal: 720,
            previousDebt: 0,
            totalDue: 720,
            chipBalance: 150,
            prizeChipsToRecover: 50,
            unsoldChips: 100,
            profit: 670,
            payableAmount: 180,
            lastSettlementEnd: null,
            unsettledSince: null
          }
        }
      ],
      totals: {
        chipsDelivered: 1000,
        totalSales: 900,
        totalPrizes: 50,
        commission: 180,
        subtotal: 720,
        previousDebt: 0,
        totalDue: 720,
        collected: 700,
        debtCarried: 20,
        unsoldChips: 100,
        chipsLeft: 100
      }
    });

    const text = pdf.toString('latin1');
    expect(text).toContain('Cuenta corriente de cajeros');
    expect(text).toContain('cajero1');
    expect(text).toContain('TOTALES');
    expect(text).toContain('Liquid.');
  });
});

describe('generateOwnerAccountPdf', () => {
  const movement = (i: number, overrides: Partial<OwnerAccountMovement> = {}): OwnerAccountMovement => ({
    id: `m-${i}`,
    kind: 'COLLECTION',
    cashierId: i % 2 === 0 ? 'cashier-1' : 'cashier-2',
    cashierUsername: i % 2 === 0 ? 'cajero1' : 'cajero2',
    settlementId: null,
    cash: 100,
    profit: 0,
    description: `Cobro ${i}`,
    createdAt: new Date('2026-11-20T15:00:00.000Z'),
    ...overrides
  });

  const summary = (movements: OwnerAccountMovement[]): OwnerAccountSummary & { ownerUsername: string } => ({
    ownerUsername: 'owner',
    periodStart: new Date('2026-11-15T03:00:00.000Z'),
    periodEnd: new Date('2026-11-22T02:59:59.999Z'),
    settled: {
      settlements: 1,
      totalSales: 900,
      commission: 180,
      subtotal: 720,
      prizes: 50,
      profit: 670,
      collected: 700,
      cashFlow: 650,
      chipsDelivered: 1000,
      chipsRecovered: 50
    },
    collectedInRange: 700,
    current: {
      cashierDebt: 20,
      openSubtotal: 80,
      openSales: 100,
      openPrizes: 0,
      cashierChips: 100,
      playerChips: 300
    },
    movements
  });

  it('incluye totales, situación actual, desglose por cajero y movimientos', () => {
    const pdf = generateOwnerAccountPdf(
      summary([
        movement(0, { kind: 'SETTLEMENT', cash: 0, profit: 720, description: 'Liquidacion semana' }),
        movement(1, { kind: 'PRIZES', cash: -50, profit: -50, description: 'Premios' })
      ])
    );
    const text = pdf.toString('latin1');

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
    expect(text).toContain('Cuenta del owner');
    expect(text).toContain('Ganancia \\(ingreso neto - premios\\)');
    expect(text).toContain('670,00');
    expect(text).toContain('Por cajero');
    expect(text).toContain('cajero2');
    expect(text).toContain('Liquidacion semana');
    expect(text).toContain('pagina 1 de 1');
  });

  it('pagina los movimientos cuando no entran en una hoja', () => {
    const movements = Array.from({ length: 120 }, (_, i) => movement(i));
    const text = generateOwnerAccountPdf(summary(movements)).toString('latin1');

    const pages = Number(/\/Count (\d+)/.exec(text)?.[1]);
    expect(pages).toBeGreaterThan(1);
    expect(text).toContain(`pagina ${pages} de ${pages}`);
    expect(text).toContain('Cobro 119');
    // xref consistente: un offset por objeto (catálogo, páginas, 2 fuentes y 2 por hoja).
    expect(text).toContain(`xref\n0 ${4 + pages * 2 + 1}`);
  });

  it('sin movimientos lo indica', () => {
    const text = generateOwnerAccountPdf(summary([])).toString('latin1');
    expect(text).toContain('No hay liquidaciones ni cobros en el periodo.');
    expect(text).not.toContain('Por cajero');
  });
});
