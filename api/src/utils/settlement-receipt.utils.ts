import {
  AdminChipPurchase,
  CashierPeriodAccount,
  CashierPeriodAccountTotals,
  CashierSettlement,
  OwnerAccountSummary,
  settlementAmountDue,
  settlementCollectionAmount
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

/**
 * Arma un PDF con una página por cada contenido. Objetos: 1 catálogo, 2 páginas,
 * 3-4 fuentes, y por cada página un objeto Page y su stream.
 */
function buildPdf(content: string | string[], width: number, height: number): Buffer {
  const pages = Array.isArray(content) ? content : [content];
  const pageObject = (index: number) => 5 + index * 2;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObject(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  pages.forEach((page, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObject(i) + 1} 0 R >>`,
      `<< /Length ${Buffer.byteLength(page, 'latin1')} >>\nstream\n${page}endstream`
    );
  });

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
    const pending = data.pendingCollection ?? 0;
    content += pdfText('Cobrado', 72, 745, 10);
    content += pdfText(money(data.collected), 72, 710, 22, true);
    content += pdfText(pending > 0 ? 'Cobro pendiente de confirmar' : 'Queda debiendo', 320, 745, 10);
    content += pdfText(money(pending > 0 ? pending : data.debtCarried), 320, 710, 16, true);
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
    ...(data.prizesDeducted
      ? ([
          ['Premios (descontados del subtotal)', money(data.totalPrizesPaid)],
          ['Subtotal (venta - comision - premios)', money(subtotal)]
        ] as Array<[string, string]>)
      : ([['Subtotal (venta - comision)', money(subtotal)]] as Array<[string, string]>))
  ];

  if (!legacy) {
    lines.push(
      ['Saldo anterior', money(data.previousDebt)],
      ['Cobro (a cuenta)', money(data.onAccountCollected)],
      ['Total a cobrar', money(settlementAmountDue(data))],
      ['Cobro de la liquidacion', money(settlementCollectionAmount(data))],
      ['Pendiente de confirmar', money(data.pendingCollection)],
      ['Cobrado (confirmado)', money(data.collected)],
      ['Queda debiendo', money(data.debtCarried)],
      null,
      ['Fichas entregadas', chips(data.chipsDelivered)],
      ['Balance de fichas', chips(data.chipBalanceBefore)],
      ['Premios (fichas retiradas)', chips(data.prizeChipsRecovered)],
      ['No vendidas (quedan al cajero)', chips(data.chipsLeft)],
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
    data.prizesDeducted
      ? 'La comision se calcula sobre la venta de fichas. Los premios los paga el cajero y se descuentan del subtotal.'
      : 'La comision se calcula sobre la venta de fichas. Los premios se le pagan al jugador aparte.',
    60,
    48,
    8
  );

  return buildPdf(content, 595, 842);
}

/**
 * Resumen de la cuenta corriente de todos los cajeros a una fecha de corte (A4 apaisado).
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
    `Corte: ${formatDate(data.periodEnd)} ${formatTime(data.periodEnd)} - cada cajero desde su ultima liquidacion`,
    40,
    548,
    10
  );

  const columns = [
    { label: 'Cajero', x: 38 },
    { label: 'Balance', x: 130 },
    { label: 'Venta', x: 205 },
    { label: 'Premios', x: 280 },
    { label: 'Comision', x: 355 },
    { label: 'Subtotal', x: 430 },
    { label: 'Saldo ant.', x: 505 },
    { label: 'Cobro', x: 580 },
    { label: 'Total', x: 655 },
    { label: 'Estado', x: 740 }
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
    row([
      (preview.cashierUsername ?? '').slice(0, 18) + (preview.prizesDeducted ? ' *' : ''),
      short(preview.chipBalance),
      short(preview.totalSales),
      short(preview.totalPrizes),
      short(preview.commission),
      short(preview.subtotal),
      short(preview.previousDebt),
      short(preview.onAccountCollected),
      short(preview.amountDue),
      !settlement ? 'Pend.' : (settlement.pendingCollection ?? 0) > 0 ? 'A conf.' : 'Liquid.'
    ]);
  }

  y -= 4;
  content += `30 ${y + 12} m 812 ${y + 12} l S\n`;
  row(
    [
      'TOTALES',
      short(data.totals.chipBalance),
      short(data.totals.totalSales),
      short(data.totals.totalPrizes),
      short(data.totals.commission),
      short(data.totals.subtotal),
      short(data.totals.previousDebt),
      short(data.totals.onAccountCollected),
      short(data.totals.amountDue),
      ''
    ],
    true
  );

  content += pdfText(
    'Subtotal = venta - comision (* tambien - premios). Cobro = cobros a cuenta. Total = saldo anterior + subtotal - cobro. Balance = fichas del cajero.',
    40,
    45,
    7
  );

  return buildPdf(content, 842, 595);
}

const signedMoney = (value: number): string => {
  const amount = Number(value) || 0;
  return `${amount < 0 ? '-' : ''}${money(Math.abs(amount))}`;
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const MOVEMENT_KIND_LABELS: Record<string, string> = {
  SETTLEMENT: 'Liquidacion',
  COLLECTION: 'Cobro',
  PRIZES: 'Premios'
};

/**
 * Resumen de la cuenta del owner para un rango (A4 vertical, varias páginas):
 * totales de las liquidaciones, situación actual, desglose por cajero y movimientos.
 */
export function generateOwnerAccountPdf(
  data: OwnerAccountSummary & { ownerUsername: string; generatedAt?: Date }
): Buffer {
  const generatedAt = data.generatedAt ?? new Date();
  const pages: string[] = [];
  let content = '';
  let y = 0;

  const newPage = (first: boolean) => {
    if (content) pages.push(content);
    content = '0.6 w\n50 40 495 762 re S\n';
    if (first) {
      content += pdfText('Cuenta del owner', 60, 805, 20, true);
      content += pdfText(
        `${data.ownerUsername} - ${formatDate(data.periodStart)} al ${formatDate(data.periodEnd)}`,
        60,
        786,
        10
      );
      content += '60 778 m 535 778 l S\n';
      y = 755;
    } else {
      content += pdfText(
        `Cuenta del owner - ${formatDate(data.periodStart)} al ${formatDate(data.periodEnd)} (cont.)`,
        60,
        805,
        10,
        true
      );
      content += '60 797 m 535 797 l S\n';
      y = 775;
    }
  };

  /** Asegura `space` puntos libres; si no entran, sigue en otra página. */
  const ensure = (space: number) => {
    if (y - space < 75) newPage(false);
  };

  const heading = (text: string) => {
    ensure(50);
    y -= 6;
    content += pdfText(text, 60, y, 12, true);
    y -= 20;
  };

  const line = (label: string, value: string, bold = false) => {
    ensure(18);
    content += pdfText(`${label}:`, 72, y, 10, bold);
    content += pdfText(value, 330, y, 10, bold);
    y -= 17;
  };

  newPage(true);

  const settled = data.settled;
  heading(`Liquidaciones del periodo (${settled.settlements})`);
  line('Venta de fichas', money(settled.totalSales));
  line('Comisiones de cajeros', money(settled.commission));
  line('Ingreso neto (venta - comisiones)', money(settled.subtotal));
  line('Premios pagados a jugadores', money(settled.prizes));
  line('Ganancia (ingreso neto - premios)', signedMoney(settled.profit), true);
  line('Cobrado a cajeros', money(settled.collected));
  line('Caja neta (cobrado - premios)', signedMoney(settled.cashFlow), true);
  line('Cobros registrados en el rango', money(data.collectedInRange));
  line('Fichas entregadas', chips(settled.chipsDelivered));
  line('Fichas recuperadas', chips(settled.chipsRecovered));

  heading(`Situacion al ${formatDate(generatedAt)} ${formatTime(generatedAt)}`);
  line('Deuda de cajeros', money(data.current.cashierDebt));
  line('Sin liquidar (venta - comision)', money(data.current.openSubtotal));
  line('Venta sin liquidar', money(data.current.openSales));
  line('Premios sin liquidar', money(data.current.openPrizes));
  line('Fichas en cajeros', chips(data.current.cashierChips));
  line('Fichas en jugadores', chips(data.current.playerChips));

  // Desglose por cajero a partir de los movimientos del rango.
  const byCashier = new Map<string, { username: string; cash: number; profit: number; settlements: number }>();
  for (const movement of data.movements) {
    const entry = byCashier.get(movement.cashierId) ?? {
      username: movement.cashierUsername,
      cash: 0,
      profit: 0,
      settlements: 0
    };
    entry.cash += Number(movement.cash) || 0;
    entry.profit += Number(movement.profit) || 0;
    if (movement.kind === 'SETTLEMENT') entry.settlements += 1;
    byCashier.set(movement.cashierId, entry);
  }

  if (byCashier.size > 0) {
    heading('Por cajero');
    ensure(20);
    content += pdfText('Cajero', 72, y, 9, true);
    content += pdfText('Liquidaciones', 250, y, 9, true);
    content += pdfText('Caja', 350, y, 9, true);
    content += pdfText('Ganancia', 450, y, 9, true);
    y -= 16;
    const rows = [...byCashier.values()].sort((a, b) => b.profit - a.profit);
    for (const row of rows) {
      ensure(16);
      content += pdfText(truncate(row.username, 30), 72, y, 9);
      content += pdfText(String(row.settlements), 250, y, 9);
      content += pdfText(signedMoney(row.cash), 350, y, 9);
      content += pdfText(signedMoney(row.profit), 450, y, 9);
      y -= 15;
    }
  }

  heading(`Movimientos (${data.movements.length})`);
  if (data.movements.length === 0) {
    content += pdfText('No hay liquidaciones ni cobros en el periodo.', 72, y, 9);
    y -= 15;
  } else {
    const header = () => {
      content += pdfText('Fecha', 60, y, 8, true);
      content += pdfText('Tipo', 128, y, 8, true);
      content += pdfText('Cajero', 185, y, 8, true);
      content += pdfText('Detalle', 265, y, 8, true);
      content += pdfText('Caja', 425, y, 8, true);
      content += pdfText('Ganancia', 480, y, 8, true);
      y -= 14;
    };
    header();
    for (const movement of data.movements) {
      if (y - 14 < 75) {
        newPage(false);
        header();
      }
      const date = new Date(movement.createdAt);
      content += pdfText(`${formatDate(date).slice(0, 5)} ${formatTime(date)}`, 60, y, 8);
      content += pdfText(MOVEMENT_KIND_LABELS[movement.kind] ?? movement.kind, 128, y, 8);
      content += pdfText(truncate(movement.cashierUsername, 16), 185, y, 8);
      content += pdfText(truncate(movement.description ?? '', 34), 265, y, 8);
      content += pdfText(movement.cash === 0 ? '-' : signedMoney(movement.cash), 425, y, 8);
      content += pdfText(movement.profit === 0 ? '-' : signedMoney(movement.profit), 480, y, 8);
      y -= 13;
    }
  }

  pages.push(content);
  const total = pages.length;
  const footer = (index: number) =>
    pdfText(
      `Generado el ${formatDate(generatedAt)} ${formatTime(generatedAt)} por ArenaBet - pagina ${index + 1} de ${total}`,
      60,
      50,
      8
    );
  return buildPdf(pages.map((page, index) => page + footer(index)), 595, 842);
}

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'PAGO PENDIENTE',
  PAID: 'PAGADO',
  CANCELED: 'ANULADO'
};

/**
 * Comprobante de una carga de fichas del owner a un admin (A4).
 */
export function generateAdminChipPurchaseReceiptPdf(
  data: AdminChipPurchase & { adminUsername: string; ownerUsername: string }
): Buffer {
  const status = PURCHASE_STATUS_LABELS[data.status] ?? data.status;
  const number = String(data.receiptNumber).padStart(6, '0');

  let content = '';
  content += '0.6 w\n';
  content += '50 40 495 762 re S\n';
  content += '60 782 m 535 782 l S\n';

  content += pdfText('Comprobante de compra de fichas', 60, 805, 18, true);
  content += pdfText(`N. ${number}`, 450, 805, 12, true);
  content += pdfText(`Administrador: ${data.adminUsername}`, 60, 786, 10);

  content += '0.8 w\n60 690 475 75 re S\n';
  content += pdfText('Importe a pagar', 72, 745, 10);
  content += pdfText(money(data.amount), 72, 710, 22, true);
  content += pdfText('Estado del pago', 320, 745, 10);
  content += pdfText(status, 320, 710, 16, true);

  const lines: Array<[string, string] | null> = [
    ['Fecha', `${formatDate(data.createdAt)} ${formatTime(data.createdAt)}`],
    ['Vendedor', data.ownerUsername],
    ['Administrador', data.adminUsername],
    null,
    ['Fichas cargadas', chips(data.chips)],
    ['Precio', `${data.percentage}% del monto${data.manualPercentage ? ' (porcentaje manual)' : ''}`],
    ['Importe', money(data.amount)],
    null,
    ['Estado', status]
  ];
  if (data.confirmedAt) {
    lines.push(['Pago confirmado', `${formatDate(data.confirmedAt)} ${formatTime(data.confirmedAt)}`]);
  }
  if (data.canceledAt) {
    lines.push(['Anulado', `${formatDate(data.canceledAt)} ${formatTime(data.canceledAt)}`]);
  }
  if (data.paymentReference) lines.push(['Referencia de pago', data.paymentReference]);
  if (data.notes) lines.push(['Notas', data.notes.replace(/\s+/g, ' ').slice(0, 70)]);
  lines.push(null, ['Comprobante', data.id]);

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
    'El pago queda pendiente hasta que el owner confirma que lo recibio.',
    60,
    48,
    8
  );

  return buildPdf(content, 595, 842);
}
