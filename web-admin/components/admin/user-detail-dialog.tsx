'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChipOperationDialog } from './chip-operation-dialog';
import { ChipMovementsTable } from './chip-movements-table';
import { DollarSign, Minus, User, Mail, Calendar, Clock } from 'lucide-react';
import type { User as UserType } from 'helper';
import { UserStatus } from 'helper';
import { useChips } from '@/hooks/useChips';

interface UserDetailDialogProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOperationSuccess?: () => void;
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onOperationSuccess
}: UserDetailDialogProps) {
  const { balance, loadBalance } = useChips(user?.id);
  const [chipDialogOpen, setChipDialogOpen] = useState(false);
  const [operationType, setOperationType] = useState<'sell' | 'withdraw'>('sell');
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  useEffect(() => {
    if (user && open) {
      loadBalance();
    }
  }, [user, open, loadBalance]);

  if (!user) return null;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenChipDialog = (type: 'sell' | 'withdraw') => {
    setOperationType(type);
    setChipDialogOpen(true);
  };

  const handleChipOperationSuccess = () => {
    setRefreshTimestamp(Date.now());
    loadBalance();
    if (onOperationSuccess) {
      onOperationSuccess();
    }
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '-';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {user.username}
              </DialogTitle>
              <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                {user.status}
              </Badge>
            </div>
          </DialogHeader>

          {/* User Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Nombre Completo</span>
                </div>
                <p className="font-medium">{fullName}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="font-medium">{user.email || '-'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Balance de Fichas</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${balance?.chipBalance.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha de Registro</span>
                </div>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Última Conexión</span>
                </div>
                <p className="font-medium">{formatDate(user.lastConnection)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Rol</span>
                </div>
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <Separator />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleOpenChipDialog('sell')}
                className="flex-1"
                size="lg"
              >
                <DollarSign className="mr-2 h-5 w-5" />
                Cargar Fichas
              </Button>
              <Button
                onClick={() => handleOpenChipDialog('withdraw')}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Minus className="mr-2 h-5 w-5" />
                Retirar Fichas
              </Button>
            </div>

            {/* Recent Movements */}
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Últimos 5 Movimientos</h3>
              <ChipMovementsTable
                userId={user.id}
                limit={5}
                onRefresh={refreshTimestamp}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chip Operation Dialog */}
      {chipDialogOpen && (
        <ChipOperationDialog
          user={user}
          operationType={operationType}
          open={chipDialogOpen}
          onOpenChange={setChipDialogOpen}
          onSuccess={handleChipOperationSuccess}
        />
      )}
    </>
  );
}
