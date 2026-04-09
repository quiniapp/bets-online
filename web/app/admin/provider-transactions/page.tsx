'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { UserRole } from 'helper';
import { useProviderTransactions } from '@/hooks/useProviderTransactions';

export default function AdminProviderTransactions() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  const { transactions, loading, meta, load } = useProviderTransactions();
  const [userIdFilter, setUserIdFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
        router.push('/user/login');
      }
    }
  }, [role, router, isLoading]);

  useEffect(() => {
    if (user) load({ page, userId: userIdFilter || undefined });
  }, [user, page, load]);

  if (!user) return null;
  if (role !== UserRole.OWNER && role !== UserRole.ADMIN) return null;

  const handleSearch = () => {
    setPage(1);
    load({ page: 1, userId: userIdFilter || undefined });
  };

  const txTypeBadge = (type: string): 'destructive' | 'default' | 'secondary' => {
    if (type === 'Debit') return 'destructive';
    if (type === 'Credit') return 'default';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Transacciones del Proveedor</h1>

        <div className="flex gap-2">
          <Input
            placeholder="Filtrar por User ID"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleSearch}>Buscar</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{meta.total} transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Proveedor</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Monto</th>
                      <th className="pb-2 pr-4">Balance post</th>
                      <th className="pb-2 pr-4">Round ID</th>
                      <th className="pb-2 pr-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{tx.providerName}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={txTypeBadge(tx.transactionType)}>
                            {tx.transactionType}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 font-mono">{tx.currency} {tx.amount}</td>
                        <td className="py-2 pr-4 font-mono">{tx.balanceAfter}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground truncate max-w-[120px]">
                          {tx.providerGameRoundId ?? '—'}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Sin transacciones
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
