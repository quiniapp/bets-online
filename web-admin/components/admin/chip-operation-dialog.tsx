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
import { Loader2, Search } from 'lucide-react';
import { useChips } from '@/hooks/useChips';
import { useDebounce } from '@/hooks/useDebounce';
import { ChipMovementsTable } from './chip-movements-table';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';
import type { User } from 'helper';

interface ChipOperationDialogProps {
  user?: User;
  operationType: 'sell' | 'withdraw';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChipOperationDialog({
  user: preselectedUser,
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

  // User search state (solo activo cuando no hay preselectedUser)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(preselectedUser ?? null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const title = operationType === 'sell' ? 'Carga de Fichas' : 'Retiro de Fichas';
  const actionLabel = operationType === 'sell' ? 'Cargar' : 'Retirar';

  // Sincronizar selectedUser cuando cambia el prop preselectedUser
  useEffect(() => {
    setSelectedUser(preselectedUser ?? null);
  }, [preselectedUser]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setAmount('');
      setDescription('');
      setSearchQuery('');
      setSearchResults([]);
      if (!preselectedUser) {
        setSelectedUser(null);
      }
    }
  }, [open, preselectedUser]);

  // Búsqueda debounced de usuarios
  useEffect(() => {
    if (preselectedUser) return;
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setSearchLoading(true);
      try {
        const response = await apiService.get<User[]>(
          `/users/me/children?search=${encodeURIComponent(debouncedSearch)}&limit=8`
        );
        if (response.success && response.data) {
          setSearchResults(response.data);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    search();
  }, [debouncedSearch, preselectedUser]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Seleccioná un usuario primero',
        variant: 'destructive'
      });
      return;
    }

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
      const response = await operation(selectedUser.id, numAmount, description || undefined);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: `${title} realizado correctamente`,
        });
        setAmount('');
        setDescription('');
        setRefreshTimestamp(Date.now());
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: response.error?.message || 'Operación fallida',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar la operación',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {preselectedUser && (
            <DialogDescription>
              Usuario: <span className="font-semibold">{preselectedUser.username}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Búsqueda de usuario — solo cuando no hay preselectedUser */}
          {!preselectedUser && (
            <div className="space-y-2">
              <Label htmlFor="user-search">Usuario *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="user-search"
                  placeholder="Buscar usuario por nombre (mín. 2 caracteres)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  className="pl-9"
                  autoComplete="off"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Resultados de búsqueda */}
              {searchResults.length > 0 && !selectedUser && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto shadow-sm">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center justify-between"
                      onClick={() => handleSelectUser(u)}
                    >
                      <span className="font-medium">{u.username}</span>
                      <span className="text-xs text-muted-foreground capitalize">{u.role.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Seleccionado: {selectedUser.username}
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={loading || (!preselectedUser && !selectedUser)}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </DialogFooter>
        </form>

        {selectedUser && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4">Últimos Movimientos</h3>
              <ChipMovementsTable userId={selectedUser.id} limit={10} onRefresh={refreshTimestamp} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
