'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChips } from '@/hooks/useChips';
import { ChipMovement, ChipMovementType, CHIP_MOVEMENT_TYPE_LABELS } from 'helper';
import { formatChips } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface ChipMovementsTableProps {
  userId: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  type?: ChipMovementType;
  onRefresh?: number;
  compact?: boolean;
  infiniteScroll?: boolean;
  compactMaxHeight?: string;
}

const getMovementBadgeColor = (type: ChipMovementType): string => {
  switch (type) {
    case ChipMovementType.SELL_TO_PLAYER:
    case ChipMovementType.PRIZE:
    case ChipMovementType.DEPOSIT:
    case ChipMovementType.GAME_WIN:
    case ChipMovementType.GAME_REFUND:
      return 'bg-green-100 text-green-800';
    case ChipMovementType.WITHDRAWAL:
    case ChipMovementType.LOSS:
    case ChipMovementType.BUY_FROM_ADMIN:
    case ChipMovementType.GAME_BET:
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

const POSITIVE_TYPES: ChipMovementType[] = [
  ChipMovementType.SELL_TO_PLAYER,
  ChipMovementType.PRIZE,
  ChipMovementType.DEPOSIT,
  ChipMovementType.RECOVERY,
  ChipMovementType.GAME_WIN,
  ChipMovementType.GAME_REFUND,
  ChipMovementType.PANEL_ASSIGNMENT,
];

const formatAmount = (amount: number, type: ChipMovementType): string => {
  const isPositive = POSITIVE_TYPES.includes(type);
  const sign = isPositive ? '+' : '-';
  return `${sign}$${formatChips(Math.abs(amount))}`;
};

const getAmountColor = (type: ChipMovementType): string => {
  return POSITIVE_TYPES.includes(type) ? 'text-green-600' : 'text-red-600';
};

export function ChipMovementsTable({
  userId,
  limit = 10,
  startDate,
  endDate,
  type,
  onRefresh,
  compact = false,
  infiniteScroll = false,
  compactMaxHeight = '9rem',
}: ChipMovementsTableProps) {
  const { getMovements } = useChips();
  const [movements, setMovements] = useState<ChipMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMovements = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const response = await getMovements(userId, { page: pageNum, limit, startDate, endDate, type, compact });
      if (response.success && response.data) {
        setMovements(prev => append ? [...prev, ...response.data!] : response.data!);
        const tp = response.meta?.totalPages || 1;
        setTotalPages(tp);
        setHasMore(pageNum < tp);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, startDate, endDate, type, compact, getMovements]);

  // Reset and reload on key changes or refresh
  useEffect(() => {
    setPage(1);
    setMovements([]);
    setHasMore(true);
    loadMovements(1, false);
  }, [userId, startDate, endDate, type, onRefresh, loadMovements]);

  // Infinite scroll — listen to scroll on container
  useEffect(() => {
    if (!infiniteScroll) return;
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (loading || !hasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
        const next = page + 1;
        setPage(next);
        loadMovements(next, true);
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [infiniteScroll, loading, hasMore, page, loadMovements]);

  const handlePreviousPage = () => {
    if (page > 1) { setPage(p => p - 1); loadMovements(page - 1, false); }
  };

  const handleNextPage = () => {
    if (page < totalPages) { setPage(p => p + 1); loadMovements(page + 1, false); }
  };

  if (loading && movements.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">Cargando movimientos...</p>;
  }

  if (movements.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">Sin movimientos registrados</p>;
  }

  /* Compact list — used inside dialogs */
  if (compact) {
    return (
      <div ref={scrollRef} className="rounded-md overflow-y-auto border" style={{ maxHeight: compactMaxHeight }}>
        {movements.map((m, i) => (
          <div key={i} className={`grid items-center gap-2 px-2 py-2 text-sm ${i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`} style={{ gridTemplateColumns: '5rem 1fr auto' }}>
            <span className="text-muted-foreground text-xs tabular-nums">
              {new Date(m.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <Badge className={`${getMovementBadgeColor(m.type)} text-xs w-fit`}>
              {CHIP_MOVEMENT_TYPE_LABELS[m.type] || m.type}
            </Badge>
            <span className={`font-semibold tabular-nums text-right ${getAmountColor(m.type)}`}>
              {formatAmount(m.amount, m.type)}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && movements.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">Sin movimientos</p>
        )}
      </div>
    );
  }

  /* Full table — used in standalone pages */
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Bal. Anterior</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Bal. Nuevo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements.map(m => (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {new Date(m.createdAt).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge className={getMovementBadgeColor(m.type)}>
                    {CHIP_MOVEMENT_TYPE_LABELS[m.type] || m.type}
                  </Badge>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${getAmountColor(m.type)}`}>
                  {formatAmount(m.amount, m.type)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground text-right">
                  ${formatChips(m.previousBalance)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                  ${formatChips(m.newBalance)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {m.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-muted border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={page === 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page === totalPages || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
