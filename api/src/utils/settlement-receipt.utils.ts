import { config } from '../config';

export interface SettlementReceiptData {
  settlementId: string;
  cashierUsername: string;
  amount: number;
  createdAt: Date;
  paidAt?: Date | null;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  totalPrizes: number;
  profit: number;
  percentage?: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'PENDIENTE',
  PAID: 'PAGADA',
  CANCELED: 'CANCELADA',
  PARTIALLY_PAID: 'PAGO PARCIAL'
};

const MONEY_FORMATTER = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const ascii = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const money = (value: number): string => `$ ${MONEY_FORMATTER.format(value)}`;

const pdfText = (text: string, x: number, y: number, size: number, bold = false): string =>
  `BT /F${bold ? '2' : '1'} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`;

export function generateSettlementReceiptPdf(data: SettlementReceiptData): Buffer {
  const status = STATUS_LABELS[data.status] ?? data.status;
  const period = `${formatDate(data.periodStart)} al ${formatDate(data.periodEnd)}`;

  let content = '';
  content += '0.6 w\n';
  content += '50 40 495 762 re S\n';
  content += '60 782 m 535 782 l S\n';

  content += pdfText('Comprobante de liquidacion', 60, 805, 20, true);
  content += pdfText('Cuenta corriente de cajeros', 60, 786, 10);

  content += '0.8 w\n60 650 475 70 re S\n';
  content += pdfText('Monto a pagar', 72, 697, 10);
  content += pdfText(money(data.amount), 72, 664, 22, true);

  let y = 615;
  const lines: Array<[string, string]> = [
    ['Fecha', formatDate(data.createdAt)],
    ['Hora', formatTime(data.createdAt)],
    ['Usuario', data.cashierUsername],
    ['Periodo', period],
    ['Ventas del periodo', money(data.totalSales)],
    ['Premios del periodo', money(data.totalPrizes)],
    ['Ganancia', money(data.profit)],
    ['Comision aplicada', data.percentage !== null && data.percentage !== undefined ? `${data.percentage}%` : '-'],
    ['Estado', status],
    ['Liquidacion', data.settlementId]
  ];

  if (data.paidAt) {
    lines.push(['Pagada el', `${formatDate(data.paidAt)} ${formatTime(data.paidAt)}`]);
  }

  for (const [label, value] of lines) {
    content += pdfText(`${label}:`, 72, y, 10, true);
    content += pdfText(value, 210, y, 10);
    y -= 24;
  }

  content += pdfText('Documento generado automaticamente por ArenaBet.', 60, 62, 9);
  content += pdfText('Este comprobante no reemplaza la documentacion contable oficial.', 60, 48, 8);

  const length = Buffer.byteLength(content, 'latin1');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
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
