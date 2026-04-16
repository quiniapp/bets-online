"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUsers } from "@/hooks/useUsers"
import { useDebounce } from "@/hooks/useDebounce"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus, Search, DollarSign, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { UserStatus, type User, type Balance } from "helper"

const ITEMS_PER_PAGE = 10

export default function AdminBalances() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Only search when 3+ characters or empty
  const searchQuery = debouncedSearch.length >= 3 ? debouncedSearch : ""

  const { users, loading: usersLoading, pagination } = useUsers({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery
  })

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [userBalances, setUserBalances] = useState<Record<string, number>>({})
  const [loadingBalances, setLoadingBalances] = useState(false)
  const { toast } = useToast()
  const [adjusting, setAdjusting] = useState(false)

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Load balances for all users
  useEffect(() => {
    const loadBalances = async () => {
      if (users.length === 0) return

      setLoadingBalances(true)
      const balances: Record<string, number> = {}

      for (const user of users) {
        try {
          const response = await apiService.get<Balance>(`/chips/balance/${user.id}`)
          if (response.success && response.data) {
            balances[user.id] = response.data.chipBalance
          }
        } catch (error) {
          console.error(`Failed to load balance for user ${user.id}:`, error)
          balances[user.id] = 0
        }
      }

      setUserBalances(balances)
      setLoadingBalances(false)
    }

    loadBalances()
  }, [users])

  // Users are now filtered by the API based on searchQuery

  const handleBalanceAdjustment = async (type: "add" | "subtract") => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason || adjusting) return

    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) return

    setAdjusting(true)
    try {
      const endpoint = type === "add" ? "/chips/sell" : "/chips/withdraw"
      const response = await apiService.post(endpoint, {
        playerId: selectedUser.id,
        amount,
        description: adjustmentReason
      })

      if (response.success) {
        toast({ title: "Balance actualizado correctamente" })

        const balanceResponse = await apiService.get<Balance>(`/chips/balance/${selectedUser.id}`)
        if (balanceResponse.success && balanceResponse.data) {
          setUserBalances(prev => ({
            ...prev,
            [selectedUser.id]: (balanceResponse.data as Balance).chipBalance
          }))
        }

        setAdjustmentAmount("")
        setAdjustmentReason("")
        setSelectedUser(null)
      } else {
        toast({
          title: "Error al ajustar balance",
          description: response.error?.message ?? "Error desconocido",
          variant: "destructive"
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error de conexión"
      toast({
        title: "Error al ajustar balance",
        description: message,
        variant: "destructive"
      })
    } finally {
      setAdjusting(false)
    }
  }

  const totalSystemBalance = Object.values(userBalances).reduce((sum, balance) => sum + balance, 0)

  if (usersLoading || loadingBalances) {
    return (
      <DashboardLayout title="Gestión de Balances">
        <div className="text-center py-8">Cargando balances...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Gestión de Balances">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total Sistema</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSystemBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">en {users.length} cuentas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar usuarios (min. 3 caracteres)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className={selectedUser?.id === user.id ? "ring-2 ring-blue-500" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{user.username}</h3>
                        <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{user.email || '-'}</p>
                      <p className="text-2xl font-bold text-green-600 mb-3">
                        ${(userBalances[user.id] || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant={selectedUser?.id === user.id ? "default" : "outline"}
                      onClick={() => setSelectedUser(user)}
                    >
                      {selectedUser?.id === user.id ? "Seleccionado" : "Seleccionar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Mostrando {users.length} de {pagination.total} usuarios
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm px-3">
                  Pagina {currentPage} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Balance Adjustment Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ajustar Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium">Usuario seleccionado:</Label>
                    <p className="text-lg font-semibold">{selectedUser.username}</p>
                    <p className="text-sm text-gray-600">
                      Balance actual: ${(userBalances[selectedUser.id] || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="amount">Cantidad</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Motivo del ajuste</Label>
                    <Input
                      id="reason"
                      placeholder="Describe el motivo..."
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBalanceAdjustment("add")}
                      disabled={!adjustmentAmount || !adjustmentReason || adjusting}
                      className="flex-1"
                    >
                      {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Agregar
                    </Button>
                    <Button
                      onClick={() => handleBalanceAdjustment("subtract")}
                      disabled={!adjustmentAmount || !adjustmentReason || adjusting}
                      variant="destructive"
                      className="flex-1"
                    >
                      {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                      Restar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Selecciona un usuario para ajustar su balance</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
