'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { useChips } from '@/hooks/useChips';
import { useDebounce } from '@/hooks/useDebounce';
import { ChipMovementsTable } from './chip-movements-table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { apiService } from '@/services/api.service';
import { formatChips } from '@/lib/utils';
import type { User, Balance } from 'helper';
import { UserRole } from 'helper';

interface ChipLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ConfirmAction = 'sell' | 'withdraw';

const ROLE_OPTIONS: { role: UserRole; label: string; color: string }[] = [
  { role: UserRole.ADMIN, label: 'Admin', color: 'text-blue-500' },
  { role: UserRole.CASHIER, label: 'Cajero', color: 'text-orange-500' },
  { role: UserRole.PLAYER, label: 'Jugador', color: 'text-green-500' },
];

export function ChipLoadDialog({ open, onOpenChange, onSuccess }: ChipLoadDialogProps) {
  const { role: myRole } = useAuth();
  const { sellChips, withdraw } = useChips();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userBalance, setUserBalance] = useState<Balance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [refreshMovements, setRefreshMovements] = useState(Date.now());

  const debouncedSearch = useDebounce(search, 300);

  // Role checkboxes visible based on current user's role
  const visibleRoleOptions = ROLE_OPTIONS.filter(({ role }) => {
    if (myRole === UserRole.OWNER) return role !== UserRole.OWNER;
    if (myRole === UserRole.ADMIN) return role === UserRole.CASHIER || role === UserRole.PLAYER;
    if (myRole === UserRole.CASHIER) return false; // cashier always searches players only
    return false;
  });

  useEffect(() => {
    if (open) setSelectedRole(null);
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setSearch('');
      setSearchResults([]);
      setSelectedUser(null);
      setUserBalance(null);
      setAmount('');
      setConfirmAction(null);
    }
  }, [open]);

  // Search descendants
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    if (debouncedSearch.length < 2) return;
    if (selectedUser || !myRole) return;
    if (myRole !== UserRole.CASHIER && !selectedRole) return;

    const allowedByRole: Partial<Record<UserRole, UserRole[]>> = {
      [UserRole.OWNER]: [UserRole.ADMIN, UserRole.CASHIER, UserRole.PLAYER],
      [UserRole.ADMIN]: [UserRole.CASHIER, UserRole.PLAYER],
      [UserRole.CASHIER]: [UserRole.PLAYER],
    };
    const rolesForSearch = selectedRole
      ? [selectedRole]
      : (allowedByRole[myRole] ?? [UserRole.PLAYER]);
    const url = `/users/me/descendants?search=${encodeURIComponent(debouncedSearch)}&roles=${rolesForSearch.join(',')}&limit=10`;

    setSearchLoading(true);
    apiService.get<User[]>(url)
      .then(res => { if (res.success && res.data) setSearchResults(res.data); })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [search, debouncedSearch, selectedRole, selectedUser, myRole]);

  const loadUserBalance = useCallback(async (userId: string) => {
    setBalanceLoading(true);
    try {
      const res = await apiService.get<{ balance: Balance }>(`/chips/balance/${userId}`);
      if (res.success && res.data) setUserBalance(res.data.balance);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchResults([]);
    loadUserBalance(user.id);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserBalance(null);
    setAmount('');
    setSearch('');
    setSearchResults([]);
  };

  const handleRoleChange = (role: UserRole | null) => {
    setSelectedRole(role);
    setSearchResults([]);
  };

  const handleConfirm = async () => {
    if (!selectedUser || !confirmAction) return;
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;

    setOperationLoading(true);
    try {
      const op = confirmAction === 'sell' ? sellChips : withdraw;
      const res = await op(selectedUser.id, num);
      if (res.success) {
        toast({ title: 'Operación exitosa', description: `${confirmAction === 'sell' ? 'Carga' : 'Débito'} de $${formatChips(num)} realizado` });
        setAmount('');
        setConfirmAction(null);
        setRefreshMovements(Date.now());
        await loadUserBalance(selectedUser.id);
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: res.error?.message || 'Operación fallida', variant: 'destructive' });
        setConfirmAction(null);
      }
    } catch {
      toast({ title: 'Error', description: 'Error al procesar la operación', variant: 'destructive' });
      setConfirmAction(null);
    } finally {
      setOperationLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { ADMIN: 'Admin', CASHIER: 'Cajero', PLAYER: 'Jugador' };
    return map[role] ?? role;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargar / Debitar Fichas</DialogTitle>
          </DialogHeader>

          {/* Search section */}
          {!selectedUser ? (
            <div className="space-y-3">
              {/* Role filters — hidden for CASHIER */}
              {visibleRoleOptions.length > 0 && (
                <div className="flex flex-wrap justify-around">
                  {visibleRoleOptions.map(({ role, label, color }) => (
                    <div
                      key={role}
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => handleRoleChange(selectedRole === role ? null : role)}
                    >
                      <input
                        type="radio"
                        name="role-filter"
                        value={role}
                        checked={selectedRole === role}
                        onChange={() => {}}
                        onClick={e => { e.stopPropagation(); handleRoleChange(selectedRole === role ? null : role); }}
                        className="accent-primary cursor-pointer"
                      />
                      <span className={`text-sm font-medium ${color}`}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario (mín. 2 caracteres)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="rounded-md border overflow-y-auto" style={{ maxHeight: '9rem' }}>
                  {searchResults.map((u, i) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full text-left px-2 py-2 text-sm grid items-center gap-2 cursor-pointer hover:brightness-110 ${i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                      style={{ gridTemplateColumns: '1fr auto' }}
                      onClick={() => handleSelectUser(u)}
                    >
                      <span className="font-medium truncate">{u.username}</span>
                      <Badge variant="secondary" className="text-xs w-fit">{roleLabel(u.role)}</Badge>
                    </button>
                  ))}
                </div>
              )}

              {search.length >= 2 && !searchLoading && searchResults.length === 0 && (myRole === UserRole.CASHIER || !!selectedRole) && (
                <p className="text-sm text-muted-foreground text-center py-2">Sin resultados</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected user header */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleClearUser}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel(selectedUser.role)}</p>
                </div>
                {balanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : userBalance ? (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-bold text-green-600">${formatChips(userBalance.chipBalance)}</p>
                  </div>
                ) : null}
              </div>

              {/* Movements history */}
              <div>
                <p className="text-sm font-medium mb-2">Historial de movimientos</p>
                <ChipMovementsTable userId={selectedUser.id} limit={20} onRefresh={refreshMovements} compact infiniteScroll />
              </div>

              <Separator />

              {/* Amount input + action buttons */}
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  disabled={!amountValid}
                  onClick={() => setConfirmAction('withdraw')}
                  className="w-full"
                >
                  Debitar Fichas
                </Button>
                <Button
                  disabled={!amountValid}
                  onClick={() => setConfirmAction('sell')}
                  className="w-full"
                >
                  Cargar Fichas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmAction === 'sell' ? 'Confirmar carga' : 'Confirmar débito'}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <p className="text-sm">
              {confirmAction === 'sell' ? 'Cargar' : 'Debitar'}{' '}
              <span className="font-bold text-primary">${formatChips(parsedAmount || 0)}</span>{' '}
              {confirmAction === 'sell' ? 'a' : 'de'}{' '}
              <span className="font-bold">{selectedUser?.username}</span>
            </p>
            {userBalance && (
              <p className="text-xs text-muted-foreground">
                Balance actual: ${formatChips(userBalance.chipBalance)}
                {confirmAction === 'sell'
                  ? ` → $${formatChips(userBalance.chipBalance + (parsedAmount || 0))}`
                  : ` → $${formatChips(Math.max(0, userBalance.chipBalance - (parsedAmount || 0)))}`}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={operationLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={operationLoading}>
              {operationLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {operationLoading ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
