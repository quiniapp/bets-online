import {
  CashierPeriodAccount,
  CashierPeriodAccountTotals,
  CashierSettlement
} from 'helper';
import { config } from '../config';

export interface SettlementReceiptData extends CashierSettlement {
  cashierUsername: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'SIN COBRAR',
  PAID: 'COBRADA',
  CANCELED: 'CANCELADA',
  PARTIALLY_PAID: 'COBRO PARCIAL'
};

const MONEY_FORMATTER = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const ascii = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');

const escapePdfText = (value: string): string =>
  ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);

const money = (value: number | null | undefined): string =>
  `$ ${MONEY_FORMATTER.format(Number(value) || 0)}`;

const chips = (value: number | null | undefined): string =>
  MONEY_FORMATTER.format(Number(value) || 0);

const pdfText = (text: string, x: number, y: number, size: number, bold = false): string =>
  `BT /F${bold ? '2' : '1'} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`;

function buildPdf(content: string, width: number, height: number): Buffer {
  const length = Buffer.byteLength(content, 'latin1');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/**
 * Comprobante de una liquidación de cajero.
 */
export function generateSettlementReceiptPdf(data: SettlementReceiptData): Buffer {
  const status = STATUS_LABELS[data.status] ?? data.status;
  const period = `${formatDate(data.periodStart)} al ${formatDate(data.periodEnd)}`;
  const legacy = data.subtotal === null || data.subtotal === undefined;
  const commission = data.commission ?? data.payableAmount;
  const subtotal = data.subtotal ?? data.totalSales - commission;

  let content = '';
  content += '0.6 w\n';
  content += '50 40 495 762 re S\n';
  content += '60 782 m 535 782 l S\n';

  content += pdfText('Liquidacion de cajero', 60, 805, 20, true);
  content += pdfText(`Cuenta corriente - ${data.cashierUsername}`, 60, 786, 10);

  content += '0.8 w\n60 690 475 75 re S\n';
  if (legacy) {
    content += pdfText('Comision (modelo anterior)', 72, 745, 10);
    content += pdfText(money(commission), 72, 710, 22, true);
  } else {
    content += pdfText('Cobrado', 72, 745, 10);
    content += pdfText(money(data.collected), 72, 710, 22, true);
    content += pdfText('Arrastre (queda debiendo)', 320, 745, 10);
    content += pdfText(money(data.debtCarried), 320, 710, 16, true);
  }

  const lines: Array<[string, string] | null> = [
    ['Fecha', `${formatDate(data.createdAt)} ${formatTime(data.createdAt)}`],
    ['Cajero', data.cashierUsername],
    ['Periodo', period],
    ['Estado', status],
    null,
    ['Venta de fichas', money(data.totalSales)],
    [
      'Comision',
      `${money(commission)}${data.percentage !== null && data.percentage !== undefined ? ` (${data.percentage}%)` : ''}`
    ],
    ['Subtotal (venta - comision)', money(subtotal)]
  ];

  if (!legacy) {
    lines.push(
      ['Saldo anterior', money(data.previousDebt)],
      ['Total a cobrar', money(data.totalDue)],
      ['Cobro', money(data.collected)],
      ['Arrastre', money(data.debtCarried)],
      null,
      ['Fichas entregadas', chips(data.chipsDelivered)],
      ['Premios (fichas retiradas)', chips(data.prizeChipsRecovered)],
      ['Fichas no vendidas', chips(data.unsoldChips)],
      ['Deje (quedan al cajero)', chips(data.chipsLeft)],
      ['No vendidas retiradas', chips(data.unsoldChipsRecovered)]
    );
  } else {
    lines.push(['Premios del periodo', money(data.totalPrizesPaid)]);
  }

  lines.push(null, ['Liquidacion', data.id]);
  if (data.paymentReference) {
    lines.push(['Referencia', data.paymentReference]);
  }

  let y = 660;
  for (const line of lines) {
    if (!line) {
      y -= 8;
      content += `60 ${y + 14} m 535 ${y + 14} l S\n`;
      continue;
    }
    const [label, value] = line;
    content += pdfText(`${label}:`, 72, y, 10, true);
    content += pdfText(value, 250, y, 10);
    y -= 21;
  }

  content += pdfText('Documento generado automaticamente por ArenaBet.', 60, 62, 9);
  content += pdfText(
    'La comision se calcula sobre la venta de fichas. Los premios los paga el owner al jugador.',
    60,
    48,
    8
  );

  return buildPdf(content, 595, 842);
}

/**
 * Resumen de la cuenta corriente de todos los cajeros en un período (A4 apaisado).
 */
export function generatePeriodSummaryPdf(data: {
  periodStart: Date;
  periodEnd: Date;
  accounts: CashierPeriodAccount[];
  totals: CashierPeriodAccountTotals;
}): Buffer {
  let content = '';
  content += '0.6 w\n';
  content += '30 30 782 525 re S\n';
  content += pdfText('Cuenta corriente de cajeros', 40, 565, 18, true);
  content += pdfText(
    `Periodo: ${formatDate(data.periodStart)} al ${formatDate(data.periodEnd)}`,
    40,
    548,
    10
  );

  const columns = [
    { label: 'Cajero', x: 38 },
    { label: 'Entregadas', x: 120 },
    { label: 'Venta', x: 182 },
    { label: 'Premios', x: 244 },
    { label: 'Comision', x: 306 },
    { label: 'Subtotal', x: 368 },
    { label: 'Saldo ant.', x: 430 },
    { label: 'Total', x: 492 },
    { label: 'Cobro', x: 554 },
    { label: 'Arrastre', x: 616 },
    { label: 'No vend.', x: 678 },
    { label: 'Deje', x: 730 },
    { label: 'Estado', x: 770 }
  ];

  let y = 525;
  for (const column of columns) {
    content += pdfText(column.label, column.x, y, 8, true);
  }
  content += '30 515 m 812 515 l S\n';
  y -= 22;

  const row = (values: string[], bold = false) => {
    values.forEach((value, index) => {
      content += pdfText(value, columns[index].x, y, 7, bold);
    });
    y -= 16;
  };

  const short = (value: number | null | undefined) => MONEY_FORMATTER.format(Number(value) || 0);

  for (const { preview, settlement } of data.accounts) {
    if (y < 70) break;
    const collected = settlement ? settlement.collected ?? 0 : null;
    const debtCarried = settlement ? settlement.debtCarried ?? 0 : null;
    const chipsLeft = settlement ? settlement.chipsLeft ?? 0 : null;
    row([
      (preview.cashierUsername ?? '').slice(0, 16),
      short(preview.chipsDelivered),
      short(preview.totalSales),
      short(preview.totalPrizes),
      short(preview.commission),
      short(preview.subtotal),
      short(preview.previousDebt),
      short(preview.totalDue),
      collected === null ? '-' : short(collected),
      debtCarried === null ? '-' : short(debtCarried),
      short(preview.unsoldChips),
      chipsLeft === null ? '-' : short(chipsLeft),
      settlement ? 'Liquid.' : 'Pend.'
    ]);
  }

  y -= 4;
  content += `30 ${y + 12} m 812 ${y + 12} l S\n`;
  row(
    [
      'TOTALES',
      short(data.totals.chipsDelivered),
      short(data.totals.totalSales),
      short(data.totals.totalPrizes),
      short(data.totals.commission),
      short(data.totals.subtotal),
      short(data.totals.previousDebt),
      short(data.totals.totalDue),
      short(data.totals.collected),
      short(data.totals.debtCarried),
      short(data.totals.unsoldChips),
      short(data.totals.chipsLeft),
      ''
    ],
    true
  );

  content += pdfText(
    'Subtotal = venta - comision. Total = saldo anterior + subtotal. Arrastre = total - cobro. Filas pendientes: cobro y deje se definen al liquidar.',
    40,
    45,
    7
  );

  return buildPdf(content, 842, 595);
}
