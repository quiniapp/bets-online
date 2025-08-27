"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { mockTransactions, mockUsers, type Transaction } from "@/lib/mock-data"
import { Search, Download, Plus } from "lucide-react"

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const filteredTransactions = transactions.filter((transaction) => {
    const user = mockUsers.find((u) => u.id === transaction.userId)
    const matchesSearch =
      user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || transaction.type === filterType
    return matchesSearch && matchesFilter
  })

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-green-500"
      case "withdrawal":
        return "bg-red-500"
      case "bet":
        return "bg-blue-500"
      case "win":
        return "bg-yellow-500"
      case "adjustment":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const totalDeposits = transactions.filter((t) => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalBets = transactions.filter((t) => t.type === "bet").reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalWins = transactions.filter((t) => t.type === "win").reduce((sum, t) => sum + t.amount, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transacciones</h1>
            <p className="text-muted-foreground">Gestiona todas las transacciones del casino</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transacción
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Depósitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalDeposits.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Retiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalWithdrawals.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Apuestas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${totalBets.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Ganancias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">${totalWins.toFixed(2)}</div>
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
                    placeholder="Buscar por usuario o descripción..."
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
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdrawal">Retiros</SelectItem>
                  <SelectItem value="bet">Apuestas</SelectItem>
                  <SelectItem value="win">Ganancias</SelectItem>
                  <SelectItem value="adjustment">Ajustes</SelectItem>
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
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Monto</th>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const user = mockUsers.find((u) => u.id === transaction.userId)
                    return (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-sm">{transaction.id}</td>
                        <td className="p-2">{user?.username || "Usuario desconocido"}</td>
                        <td className="p-2">
                          <Badge className={getTransactionBadgeColor(transaction.type)}>{transaction.type}</Badge>
                        </td>
                        <td className="p-2">
                          <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2">{transaction.description}</td>
                        <td className="p-2">{transaction.createdAt.toLocaleDateString()}</td>
                        <td className="p-2">
                          <Button variant="outline" size="sm">
                            Ver Detalles
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
