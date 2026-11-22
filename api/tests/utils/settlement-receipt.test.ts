import { CompensationType, SettlementStatus } from 'helper';
import {
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
    expect(text).toContain('Arrastre');
    expect(text).toContain('Deje');
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
