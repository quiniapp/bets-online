'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChips } from '@/hooks/useChips';
import { ChipMovement, ChipMovementType, CHIP_MOVEMENT_TYPE_LABELS } from 'helper';
import { formatChips } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChipMovementsTableProps {
  userId: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  type?: ChipMovementType;
  onRefresh?: number; // Timestamp to trigger refresh
}

const getMovementBadgeColor = (type: ChipMovementType): string => {
  switch (type) {
    case ChipMovementType.SELL_TO_PLAYER:
    case ChipMovementType.PRIZE:
    case ChipMovementType.DEPOSIT:
      return 'bg-green-100 text-green-800';
    case ChipMovementType.WITHDRAWAL:
    case ChipMovementType.LOSS:
    case ChipMovementType.BUY_FROM_ADMIN:
      return 'bg-red-100 text-red-800';
    case ChipMovementType.RECOVERY:
    case ChipMovementType.ADJUSTMENT:
      return 'bg-yellow-100 text-yellow-800';
    case ChipMovementType.PANEL_ASSIGNMENT:
    case ChipMovementType.PANEL_SALE:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatAmount = (amount: number, type: ChipMovementType): string => {
  const isPositive = [
    ChipMovementType.SELL_TO_PLAYER,
    ChipMovementType.PRIZE,
    ChipMovementType.DEPOSIT,
    ChipMovementType.RECOVERY,
  ].includes(type);

  const sign = isPositive ? '+' : '-';
  return `${sign}$${formatChips(Math.abs(amount))}`;
};

const getAmountColor = (type: ChipMovementType): string => {
  const isPositive = [
    ChipMovementType.SELL_TO_PLAYER,
    ChipMovementType.PRIZE,
    ChipMovementType.DEPOSIT,
    ChipMovementType.RECOVERY,
  ].includes(type);

  return isPositive ? 'text-green-600' : 'text-red-600';
};

export function ChipMovementsTable({
  userId,
  limit = 10,
  startDate,
  endDate,
  type,
  onRefresh
}: ChipMovementsTableProps) {
  const { getMovements } = useChips();
  const [movements, setMovements] = useState<ChipMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const response = await getMovements(userId, {
        page,
        limit,
        startDate,
        endDate,
        type
      });

      if (response.success && response.data) {
        setMovements(response.data);
        if (response.meta) {
          setTotalPages(response.meta.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [userId, page, limit, startDate, endDate, type, onRefresh]);

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  if (loading && movements.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-gray-500">Cargando movimientos...</p>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-gray-500">No hay movimientos registrados</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Anterior
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Nuevo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {new Date(movement.createdAt).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge className={getMovementBadgeColor(movement.type)}>
                    {CHIP_MOVEMENT_TYPE_LABELS[movement.type] || movement.type}
                  </Badge>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${getAmountColor(movement.type)}`}>
                  {formatAmount(movement.amount, movement.type)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                  ${formatChips(movement.previousBalance)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                  ${formatChips(movement.newBalance)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {movement.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
