"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { mockUsers, mockTransactions, type User, type Transaction } from "@/lib/mock-data"
import { Plus, Minus, Search, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function AdminBalances() {
  const { role, user: currentUser } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")

  useEffect(() => {
    if (role !== "admin") {
      router.push("/admin/login")
    }
  }, [role, router])

  if (role !== "admin") return null

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBalanceAdjustment = (type: "add" | "subtract") => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) return

    const amount = Number.parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) return

    const finalAmount = type === "add" ? amount : -amount

    // Update user balance
    setUsers((prev) =>
      prev.map((user) => (user.id === selectedUser.id ? { ...user, balance: user.balance + finalAmount } : user)),
    )

    // Add transaction record
    const newTransaction: Transaction = {
      id: `tx${Date.now()}`,
      userId: selectedUser.id,
      type: "adjustment",
      amount: finalAmount,
      description: adjustmentReason,
      adminId: currentUser?.id,
      createdAt: new Date(),
    }

    setTransactions((prev) => [newTransaction, ...prev])

    // Reset form
    setAdjustmentAmount("")
    setAdjustmentReason("")
    setSelectedUser(null)
  }

  const getUserTransactions = (userId: string) => {
    return transactions.filter((tx) => tx.userId === userId).slice(0, 3)
  }

  const totalSystemBalance = users.reduce((sum, user) => sum + user.balance, 0)
  const highestBalance = Math.max(...users.map((u) => u.balance))
  const lowestBalance = Math.min(...users.map((u) => u.balance))

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Más Alto</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${highestBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">usuario premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Más Bajo</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${lowestBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">requiere atención</p>
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
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{user.email}</p>
                      <p className="text-2xl font-bold text-green-600 mb-3">${user.balance.toFixed(2)}</p>

                      {/* Recent transactions */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Transacciones recientes:</p>
                        <div className="space-y-1">
                          {getUserTransactions(user.id).map((tx) => (
                            <div key={tx.id} className="flex justify-between text-xs">
                              <span className="text-gray-600 truncate mr-2">{tx.description}</span>
                              <span
                                className={tx.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
                              >
                                {tx.amount > 0 ? "+" : ""}${tx.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {getUserTransactions(user.id).length === 0 && (
                            <span className="text-xs text-gray-400">Sin transacciones recientes</span>
                          )}
                        </div>
                      </div>
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
                    <p className="text-sm text-gray-600">Balance actual: ${selectedUser.balance.toFixed(2)}</p>
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
