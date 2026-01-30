'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useChips } from '@/hooks/useChips';
import { ChipMovementsTable } from './chip-movements-table';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'helper';

interface ChipOperationDialogProps {
  user: User;
  operationType: 'sell' | 'withdraw';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChipOperationDialog({
  user,
  operationType,
  open,
  onOpenChange,
  onSuccess
}: ChipOperationDialogProps) {
  const { sellChips, withdraw, loading } = useChips();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  const title = operationType === 'sell' ? 'Carga de Fichas' : 'Retiro de Fichas';
  const actionLabel = operationType === 'sell' ? 'Cargar' : 'Retirar';

  useEffect(() => {
    if (!open) {
      setAmount('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive'
      });
      return;
    }

    try {
      const operation = operationType === 'sell' ? sellChips : withdraw;
      const response = await operation(user.id, numAmount, description || undefined);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: `${title} realizado correctamente`,
        });
        setAmount('');
        setDescription('');
        setRefreshTimestamp(Date.now());

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Error',
          description: response.error?.message || 'Operación fallida',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar la operación',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Usuario: <span className="font-semibold">{user.username}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ingrese el monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ingrese una descripción opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{description.length}/500</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Procesando...' : actionLabel}
            </Button>
          </DialogFooter>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="text-lg font-semibold mb-4">Últimos Movimientos</h3>
          <ChipMovementsTable userId={user.id} limit={10} onRefresh={refreshTimestamp} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
