"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUsers } from "@/hooks/useUsers"
import { apiService } from "@/services/api.service"
import { Plus, Minus, Search, DollarSign } from "lucide-react"
import { UserStatus, type User, type Balance } from "helper"

export default function AdminBalances() {
  const { users, loading: usersLoading } = useUsers()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [userBalances, setUserBalances] = useState<Record<string, number>>({})
  const [loadingBalances, setLoadingBalances] = useState(false)

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

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBalanceAdjustment = async (type: "add" | "subtract") => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) return

    const amount = Number.parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      // Note: You'll need to implement an adjustment endpoint in the API
      // For now, this is a placeholder
      console.log('Balance adjustment:', { type, amount, reason: adjustmentReason })

      // Reset form
      setAdjustmentAmount("")
      setAdjustmentReason("")
      setSelectedUser(null)

      // Reload balance for the selected user
      const response = await apiService.get<Balance>(`/chips/balance/${selectedUser.id}`)
      if (response.success && response.data) {
        setUserBalances(prev => ({
          ...prev,
          [selectedUser.id]: response.data!.chipBalance
        }))
      }
    } catch (error) {
      console.error('Failed to adjust balance:', error)
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
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => (
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
                      <p className="text-gray-600 mb-2">{user.email}</p>
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
                      disabled={!adjustmentAmount || !adjustmentReason}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                    <Button
                      onClick={() => handleBalanceAdjustment("subtract")}
                      disabled={!adjustmentAmount || !adjustmentReason}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-2" />
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
