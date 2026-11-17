import { generateSettlementReceiptPdf } from '../../src/utils/settlement-receipt.utils';

describe('generateSettlementReceiptPdf', () => {
  it('genera un PDF con fecha, hora, usuario y monto', () => {
    const pdf = generateSettlementReceiptPdf({
      settlementId: '12345678-1234-1234-1234-123456789012',
      cashierUsername: 'cajero1',
      amount: 100,
      createdAt: new Date('2026-11-16T23:53:07.991Z'),
      paidAt: null,
      status: 'PENDING',
      periodStart: new Date('2026-11-09T00:00:00.000Z'),
      periodEnd: new Date('2026-11-16T23:59:59.999Z'),
      totalSales: 500,
      totalPrizes: 0,
      profit: 500,
      percentage: 20
    });

    expect(pdf.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');

    const text = pdf.toString('latin1');
    expect(text).toContain('Comprobante de liquidacion');
    expect(text).toContain('Fecha:');
    expect(text).toContain('Hora:');
    expect(text).toContain('Usuario:');
    expect(text).toContain('cajero1');
    expect(text).toContain('Monto a pagar');
    expect(text).toContain('100,00');
    expect(text).toContain('20%');
    expect(text).toContain('PENDIENTE');
  });

  it('incluye la fecha de pago cuando la liquidación está pagada', () => {
    const pdf = generateSettlementReceiptPdf({
      settlementId: '12345678-1234-1234-1234-123456789012',
      cashierUsername: 'cajero1',
      amount: 100,
      createdAt: new Date('2026-11-16T23:53:07.991Z'),
      paidAt: new Date('2026-11-17T12:30:00.000Z'),
      status: 'PAID',
      periodStart: new Date('2026-11-09T00:00:00.000Z'),
      periodEnd: new Date('2026-11-16T23:59:59.999Z'),
      totalSales: 500,
      totalPrizes: 0,
      profit: 500,
      percentage: 20
    });

    const text = pdf.toString('latin1');
    expect(text).toContain('Pagada el:');
    expect(text).toContain('PAGADA');
  });
});
