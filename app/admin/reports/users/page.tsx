"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { mockUsers, mockBets, mockTransactions, type User } from "@/lib/mock-data"
import { Search, Download, Users, UserCheck, UserX, DollarSign } from "lucide-react"

export default function UsersReportPage() {
  const [users] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive)
    return matchesSearch && matchesFilter
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.isActive).length
  const inactiveUsers = users.filter((u) => !u.isActive).length
  const totalBalance = users.reduce((sum, user) => sum + user.balance, 0)

  // Calculate user statistics
  const getUserStats = (userId: string) => {
    const userBets = mockBets.filter((bet) => bet.userId === userId)
    const userTransactions = mockTransactions.filter((tx) => tx.userId === userId)

    const totalBets = userBets.length
    const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0)
    const wonBets = userBets.filter((bet) => bet.outcome === "won").length
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0

    const deposits = userTransactions.filter((tx) => tx.type === "deposit").reduce((sum, tx) => sum + tx.amount, 0)
    const withdrawals = userTransactions
      .filter((tx) => tx.type === "withdrawal")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    return {
      totalBets,
      totalBetAmount,
      winRate,
      deposits,
      withdrawals,
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reporte de Usuarios</h1>
            <p className="text-muted-foreground">Análisis detallado de la actividad de usuarios</p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Total Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Usuarios registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                Usuarios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                {totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <UserX className="mr-2 h-4 w-4 text-red-500" />
                Usuarios Inactivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{inactiveUsers}</div>
              <p className="text-xs text-muted-foreground">
                {totalUsers > 0 ? ((inactiveUsers / totalUsers) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-blue-500" />
                Balance Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${totalBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">En todas las cuentas</p>
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
                    placeholder="Buscar por usuario o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estado del usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Usuarios</CardTitle>
            <CardDescription>{filteredUsers.length} usuarios encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Balance</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">Total Apuestas</th>
                    <th className="text-left p-2">Monto Apostado</th>
                    <th className="text-left p-2">% Victorias</th>
                    <th className="text-left p-2">Depósitos</th>
                    <th className="text-left p-2">Retiros</th>
                    <th className="text-left p-2">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const stats = getUserStats(user.id)

                    return (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{user.username}</td>
                        <td className="p-2 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-2">
                          <span className="font-medium">${user.balance.toFixed(2)}</span>
                        </td>
                        <td className="p-2">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="p-2">{stats.totalBets}</td>
                        <td className="p-2">${stats.totalBetAmount.toFixed(2)}</td>
                        <td className="p-2">
                          <span className={stats.winRate > 50 ? "text-green-600" : "text-red-600"}>
                            {stats.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2 text-green-600">${stats.deposits.toFixed(2)}</td>
                        <td className="p-2 text-red-600">${stats.withdrawals.toFixed(2)}</td>
                        <td className="p-2 text-sm">{user.createdAt.toLocaleDateString()}</td>
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
