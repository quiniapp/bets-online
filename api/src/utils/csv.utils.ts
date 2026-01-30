import { ChipMovement, ChipMovementType } from 'helper';

export const CHIP_MOVEMENT_TYPE_LABELS: Record<ChipMovementType, string> = {
  SELL_TO_PLAYER: 'Carga',
  WITHDRAWAL: 'Retiro',
  PRIZE: 'Premio',
  LOSS: 'Pérdida',
  DEPOSIT: 'Depósito',
  BUY_FROM_ADMIN: 'Compra',
  RECOVERY: 'Recuperación',
  ADJUSTMENT: 'Ajuste',
  PANEL_ASSIGNMENT: 'Asignación de Panel',
  PANEL_SALE: 'Venta de Panel'
};

export function generateMovementsCsv(movements: ChipMovement[]): string {
  const headers = ['Fecha', 'Tipo', 'Monto', 'Balance Anterior', 'Balance Nuevo', 'Descripción'];
  const rows = movements.map(m => [
    new Date(m.createdAt).toLocaleString('es-ES'),
    CHIP_MOVEMENT_TYPE_LABELS[m.type] || m.type,
    m.amount.toFixed(2),
    m.previousBalance.toFixed(2),
    m.newBalance.toFixed(2),
    m.description || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
