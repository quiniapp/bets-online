import { CashierDailyAccount, CashierDailyAccountTotals } from 'helper';

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

const money = (value: number): string => `$ ${MONEY_FORMATTER.format(Number(value) || 0)}`;

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

export function generateCashierDailyAccountPdf(account: CashierDailyAccount): Buffer {
  let content = '';
  content += '0.6 w\n';
  content += '50 40 495 762 re S\n';
  content += '60 782 m 535 782 l S\n';
  content += pdfText('Liquidacion de cuenta corriente', 60, 805, 20, true);
  content += pdfText(`Fecha: ${account.date}`, 60, 786, 11);

  let y = 745;
  const lines: Array<[string, string]> = [
    ['Cajero', account.cashierUsername],
    ['Pase (ventas)', money(account.pass)],
    ['Aciertos (premios)', money(account.successes)],
    ['Reclamos', money(account.claims)],
    ['Subtotal', money(account.subtotal)],
    ['Saldo anterior', money(account.previousBalance)],
    ['Cobros', money(account.collections)],
    ['Pagos', money(account.paid)],
    ['Arrastre', money(account.drag)],
    ['Deje', money(account.leave)],
    ['Comision', money(account.cashierCommission)],
    ['Estado', account.isLiquidated ? 'LIQUIDADA' : 'PENDIENTE']
  ];

  content += '0.8 w\n60 670 475 55 re S\n';
  content += pdfText('TOTAL', 72, 704, 10);
  content += pdfText(money(account.total), 72, 680, 22, true);
  y = 640;

  for (const [label, value] of lines) {
    content += pdfText(`${label}:`, 72, y, 10, true);
    content += pdfText(value, 230, y, 10);
    y -= 23;
  }

  content += pdfText('Documento generado automaticamente por ArenaBet.', 60, 62, 9);
  content += pdfText('La comision se calcula sobre el pase (ventas).', 60, 48, 8);

  return buildPdf(content, 595, 842);
}

export function generateDailyAccountsSummaryPdf(data: {
  date: string;
  accounts: CashierDailyAccount[];
  totals: CashierDailyAccountTotals;
}): Buffer {
  let content = '';
  content += '0.6 w\n';
  content += '40 30 762 525 re S\n';
  content += pdfText('Resumen de cuenta corriente', 40, 565, 18, true);
  content += pdfText(`Fecha: ${data.date}`, 40, 548, 10);

  const columns = [
    { label: 'Cajero', x: 48 },
    { label: 'Pase', x: 190 },
    { label: 'Aciertos', x: 265 },
    { label: 'Reclamos', x: 340 },
    { label: 'Cobros', x: 415 },
    { label: 'Pagos', x: 485 },
    { label: 'Total', x: 555 },
    { label: 'Deje', x: 635 },
    { label: 'Comision', x: 710 }
  ];

  let y = 525;
  for (const column of columns) {
    content += pdfText(column.label, column.x, y, 9, true);
  }
  content += '40 515 m 802 515 l S\n';
  y -= 22;

  const row = (values: string[], bold = false) => {
    values.forEach((value, index) => {
      content += pdfText(value, columns[index].x, y, 8, bold);
    });
    y -= 18;
  };

  for (const account of data.accounts) {
    row([
      account.cashierUsername,
      money(account.pass),
      money(account.successes),
      money(account.claims),
      money(account.collections),
      money(account.paid),
      money(account.total),
      money(account.leave),
      money(account.cashierCommission)
    ]);
  }

  y -= 6;
  content += '40 ' + (y + 12) + ' m 802 ' + (y + 12) + ' l S\n';
  row([
    'TOTALES',
    money(data.totals.pass),
    money(data.totals.successes),
    money(data.totals.claims),
    money(data.totals.collections),
    money(data.totals.paid),
    money(data.totals.total),
    money(data.totals.leave),
    money(data.totals.cashierCommission)
  ], true);

  content += pdfText('Documento generado automaticamente por ArenaBet.', 40, 45, 8);

  return buildPdf(content, 842, 595);
}
