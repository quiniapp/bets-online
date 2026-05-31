'use client';

import { useState } from 'react';
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
import { Download } from 'lucide-react';
import type { User, ChipMovementType } from 'helper';
import { ChipMovementType as MovementType } from 'helper';

interface MovementsHistoryDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DateRangeOption = 'last7' | 'last30' | 'custom' | 'all';

export function MovementsHistoryDialog({
  user,
  open,
  onOpenChange
}: MovementsHistoryDialogProps) {
  const { exportMovements } = useChips();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementType, setMovementType] = useState<ChipMovementType | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);

  const getDateRange = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date();

    switch (dateRange) {
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial Completo de Movimientos</DialogTitle>
          <p className="text-sm text-gray-500">
            Usuario: <span className="font-semibold">{user.username}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Últimos 7 días</SelectItem>
                  <SelectItem value="last30">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Select value={movementType} onValueChange={(value) => setMovementType(value as ChipMovementType | 'ALL')}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>

          <ChipMovementsTable
            userId={user.id}
            limit={10}
            startDate={range.startDate}
            endDate={range.endDate}
            type={movementType === 'ALL' ? undefined : movementType}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
