"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Loader2 } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"
import { useAuth } from "@/contexts/auth-context"
import { ChipMovementType } from "helper"

export default function TransactionsPage() {
  const { user } = useAuth()
  const { transactions, loading, loadTransactions } = useTransactions()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    if (user) {
      loadTransactions({ limit: 200 })
    }
  }, [user])

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || transaction.type === filterType
    return matchesSearch && matchesFilter
  })

  const getTransactionBadgeColor = (type: ChipMovementType) => {
    switch (type) {
      case ChipMovementType.DEPOSIT:
      case ChipMovementType.SELL_TO_PLAYER:
        return "bg-green-500"
      case ChipMovementType.WITHDRAWAL:
        return "bg-red-500"
      case ChipMovementType.LOSS:
        return "bg-blue-500"
      case ChipMovementType.PRIZE:
        return "bg-yellow-500"
      case ChipMovementType.ADJUSTMENT:
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeLabel = (type: ChipMovementType) => {
    switch (type) {
      case ChipMovementType.DEPOSIT:
        return "Depósito"
      case ChipMovementType.WITHDRAWAL:
        return "Retiro"
      case ChipMovementType.LOSS:
        return "Apuesta"
      case ChipMovementType.PRIZE:
        return "Premio"
      case ChipMovementType.SELL_TO_PLAYER:
        return "Venta Chips"
      case ChipMovementType.BUY_FROM_ADMIN:
        return "Compra Chips"
      case ChipMovementType.ADJUSTMENT:
        return "Ajuste"
      case ChipMovementType.RECOVERY:
        return "Recuperación"
      default:
        return type
    }
  }

  // Calculate totals
  const deposits = transactions.filter(
    (t) => t.type === ChipMovementType.DEPOSIT || t.type === ChipMovementType.SELL_TO_PLAYER
  )
  const withdrawals = transactions.filter((t) => t.type === ChipMovementType.WITHDRAWAL)
  const losses = transactions.filter((t) => t.type === ChipMovementType.LOSS)
  const prizes = transactions.filter((t) => t.type === ChipMovementType.PRIZE)

  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0)
  const totalLosses = losses.reduce((sum, t) => sum + t.amount, 0)
  const totalPrizes = prizes.reduce((sum, t) => sum + t.amount, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transacciones</h1>
            <p className="text-muted-foreground">
              Historial de movimientos de chips
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Nota: Actualmente muestra transacciones del usuario actual. En producción se agregaría endpoint para ver todas las transacciones del árbol.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Depósitos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${totalDeposits.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{deposits.length} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Retiros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">${totalWithdrawals.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{withdrawals.length} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Apuestas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">${totalLosses.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{losses.length} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Premios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">${totalPrizes.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{prizes.length} transacciones</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por ID o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tipo de transacción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value={ChipMovementType.DEPOSIT}>Depósitos</SelectItem>
                      <SelectItem value={ChipMovementType.WITHDRAWAL}>Retiros</SelectItem>
                      <SelectItem value={ChipMovementType.LOSS}>Apuestas</SelectItem>
                      <SelectItem value={ChipMovementType.PRIZE}>Premios</SelectItem>
                      <SelectItem value={ChipMovementType.SELL_TO_PLAYER}>Venta Chips</SelectItem>
                      <SelectItem value={ChipMovementType.ADJUSTMENT}>Ajustes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Transacciones</CardTitle>
                <CardDescription>{filteredTransactions.length} transacciones encontradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Monto</th>
                        <th className="text-left p-2">Nuevo Balance</th>
                        <th className="text-left p-2">Descripción</th>
                        <th className="text-left p-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-mono text-xs">{transaction.id.substring(0, 8)}...</td>
                            <td className="p-2">
                              <Badge className={getTransactionBadgeColor(transaction.type)}>
                                {getTypeLabel(transaction.type)}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                                {transaction.amount >= 0 ? "+" : ""}${transaction.amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-2 font-medium">${transaction.newBalance.toFixed(2)}</td>
                            <td className="p-2">{transaction.description || "-"}</td>
                            <td className="p-2 text-sm">
                              {new Date(transaction.createdAt).toLocaleDateString()}{" "}
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No se encontraron transacciones
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
