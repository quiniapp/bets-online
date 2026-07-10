'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useChips } from '@/hooks/useChips';
import { ChipMovementsTable } from './chip-movements-table';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import type { User, ChipMovementType } from 'helper';
import { ChipMovementType as MovementType } from 'helper';

interface MovementsHistoryDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DateRangeOption = 'sinceLastLoad' | 'last7' | 'last30' | 'custom' | 'all';

export function MovementsHistoryDialog({
  user,
  open,
  onOpenChange
}: MovementsHistoryDialogProps) {
  const { exportMovements, getMovements } = useChips();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRangeOption>('sinceLastLoad');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementType, setMovementType] = useState<ChipMovementType | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);
  // Fecha de la última carga manual (SELL_TO_PLAYER) — null si nunca se cargó.
  const [lastLoadDate, setLastLoadDate] = useState<Date | null>(null);
  const [lastLoadChecked, setLastLoadChecked] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLastLoadChecked(false);
    getMovements(user.id, { page: 1, limit: 1, type: MovementType.SELL_TO_PLAYER })
      .then(res => {
        if (cancelled) return;
        const last = res.success && res.data ? res.data[0] : undefined;
        setLastLoadDate(last ? new Date(last.createdAt) : null);
      })
      .catch(() => { if (!cancelled) setLastLoadDate(null); })
      .finally(() => { if (!cancelled) setLastLoadChecked(true); });
    return () => { cancelled = true; };
  }, [open, user.id, getMovements]);

  const getDateRange = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date();

    switch (dateRange) {
      case 'sinceLastLoad':
        // Sin carga previa: mostrar todos los movimientos.
        return lastLoadDate ? { startDate: lastLoadDate } : {};
      case 'last7':
        return {
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now
        };
      case 'last30':
        return {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now
        };
      case 'custom':
        return {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        };
      case 'all':
      default:
        return {};
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const range = getDateRange();
      await exportMovements(user.id, {
        ...range,
        type: movementType === 'ALL' ? undefined : movementType
      });

      toast({
        title: 'Éxito',
        description: 'El archivo CSV se ha descargado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al exportar movimientos',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const range = getDateRange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-6xl rounded-lg p-4 sm:p-6 overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Historial Completo de Movimientos</DialogTitle>
          <p className="text-sm text-gray-500">
            Usuario: <span className="font-semibold">{user.username}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* 2 renglones: rango + select / tipo + select + botón exportar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Label className="w-32 sm:w-40 shrink-0">Rango de Fechas</Label>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
                <SelectTrigger className="flex-1 w-full min-w-0">
                  <SelectValue placeholder="Seleccione rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sinceLastLoad">Desde última carga</SelectItem>
                  <SelectItem value="last7">Últimos 7 días</SelectItem>
                  <SelectItem value="last30">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Label className="w-32 sm:w-40 shrink-0">Tipo de Movimiento</Label>
              <Select value={movementType} onValueChange={(value) => setMovementType(value as ChipMovementType | 'ALL')}>
                <SelectTrigger className="flex-1 w-full min-w-0">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value={MovementType.SELL_TO_PLAYER}>Carga</SelectItem>
                  <SelectItem value={MovementType.WITHDRAWAL}>Retiro</SelectItem>
                  <SelectItem value={MovementType.PRIZE}>Premio</SelectItem>
                  <SelectItem value={MovementType.LOSS}>Pérdida</SelectItem>
                  <SelectItem value={MovementType.DEPOSIT}>Depósito</SelectItem>
                  <SelectItem value={MovementType.BUY_FROM_ADMIN}>Compra</SelectItem>
                  <SelectItem value={MovementType.RECOVERY}>Recuperación</SelectItem>
                  <SelectItem value={MovementType.ADJUSTMENT}>Ajuste</SelectItem>
                  <SelectItem value={MovementType.PANEL_ASSIGNMENT}>Asignación de Panel</SelectItem>
                  <SelectItem value={MovementType.PANEL_SALE}>Venta de Panel</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                size="icon"
                className="shrink-0 sm:hidden"
                title="Exportar CSV"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button onClick={handleExport} disabled={exporting} variant="outline" className="shrink-0 hidden sm:inline-flex">
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {dateRange === 'sinceLastLoad' && lastLoadChecked && (
            <p className="text-xs text-muted-foreground">
              {lastLoadDate
                ? `Última carga: ${lastLoadDate.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Sin cargas manuales — se muestran todos los movimientos'}
            </p>
          )}

          {dateRange === 'sinceLastLoad' && !lastLoadChecked ? (
            <p className="text-center text-sm text-muted-foreground py-4">Cargando movimientos...</p>
          ) : (
            <ChipMovementsTable
              userId={user.id}
              limit={10}
              startDate={range.startDate}
              endDate={range.endDate}
              type={movementType === 'ALL' ? undefined : movementType}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
