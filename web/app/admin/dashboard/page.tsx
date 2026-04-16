"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import { Users, Gamepad2, DollarSign, Loader2 } from "lucide-react"
import { ChipOperationDialog } from "@/components/admin/chip-operation-dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import Link from "next/link"
import ROUTER from "@/routes"
import { useUsers } from "@/hooks/useUsers"
import { useGames } from "@/hooks/useGames"
import { useChips } from "@/hooks/useChips"

export default function AdminDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  // Use high limit for dashboard stats
  const { users, loading: loadingUsers } = useUsers({ limit: 1000 })
  const { games, loading: loadingGames } = useGames()
  const { balance: myBalance, loadBalance } = useChips()
  const [loadBalanceOpen, setLoadBalanceOpen] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.OWNER && role !== UserRole.ADMIN && role !== UserRole.CASHIER) {
        console.log("❌ Access denied. Redirecting to home...", { role })
        router.push(ROUTER.SITE)
      } else {
        console.log("✅ Access granted:", { role })
      }
    }
  }, [role, router, isLoading])


  useEffect(() => {
    if (user && (role === UserRole.ADMIN || role === UserRole.CASHIER)) {
      loadBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (role !== UserRole.OWNER && role !== UserRole.ADMIN && role !== UserRole.CASHIER) {
    return null
  }

  const activeUsers = users.filter((u) => u.status === "ACTIVE").length
  const blockedUsers = users.filter((u) => u.status === "BLOCKED").length
  const activeGames = games.filter((g) => g.isActive).length

  // Demo data for charts (since we don't have time-series endpoints yet)
  const dailyRevenue = [
    { day: "Lun", revenue: 2400, bets: 45 },
    { day: "Mar", revenue: 1398, bets: 32 },
    { day: "Mié", revenue: 9800, bets: 78 },
    { day: "Jue", revenue: 3908, bets: 56 },
    { day: "Vie", revenue: 4800, bets: 89 },
    { day: "Sáb", revenue: 3800, bets: 67 },
    { day: "Dom", revenue: 4300, bets: 72 },
  ]

  const userActivity = [
    { hour: "00", users: 12 },
    { hour: "04", users: 8 },
    { hour: "08", users: 25 },
    { hour: "12", users: 45 },
    { hour: "16", users: 38 },
    { hour: "20", users: 52 },
    { hour: "24", users: 28 },
  ]

  return (
    <DashboardLayout title="Estadísticas">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeUsers} activos, {blockedUsers} bloqueados
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {users.length > 0 ? ((activeUsers / users.length) * 100).toFixed(1) : 0}% del total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Juegos Activos</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGames ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeGames}</div>
                <p className="text-xs text-muted-foreground">de {games.length} totales</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {role === UserRole.OWNER ? "Rol" : "Mi Balance"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {role === UserRole.OWNER ? (
              <>
                <div className="text-2xl font-bold">Owner</div>
                <p className="text-xs text-muted-foreground">Sin balance propio</p>
              </>
            ) : myBalance ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ${myBalance.chipBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Actualizado: {new Date(myBalance.lastUpdatedAt).toLocaleString()}
                </p>
                <Button size="sm" className="w-full" onClick={() => setLoadBalanceOpen(true)}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  Cargar Saldo
                </Button>
              </>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Diarios</CardTitle>
            <CardDescription>
              Ingresos y apuestas por día (Demo Data)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Ingresos" />
                <Bar yAxisId="right" dataKey="bets" fill="#82ca9d" name="Apuestas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad de Usuarios</CardTitle>
            <CardDescription>Usuarios activos por hora (Demo Data)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Distribution by Role */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Distribución de Usuarios por Rol</CardTitle>
          <CardDescription>Usuarios en tu árbol jerárquico</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {users.filter((u) => u.role === UserRole.OWNER).length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Owners</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {users.filter((u) => u.role === UserRole.ADMIN).length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Admins</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {users.filter((u) => u.role === UserRole.CASHIER).length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Cashiers</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {users.filter((u) => u.role === UserRole.PLAYER).length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Players</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Games Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resumen de Juegos</CardTitle>
          <CardDescription>Configuración actual de juegos</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGames ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : games.length > 0 ? (
            <div className="space-y-3">
              {games.slice(0, 5).map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{game.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${game.minBet} - ${game.maxBet} • House Edge: {game.houseEdge}%
                    </p>
                  </div>
                  <div>
                    {game.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {games.length > 5 && (
                <Link href="/admin/games">
                  <Button variant="outline" className="w-full">
                    Ver todos los juegos ({games.length})
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay juegos creados</p>
              <Link href="/admin/games">
                <Button>Crear Primer Juego</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Usuarios
            </CardTitle>
            <CardDescription>Administrar cuentas de usuario, balances y permisos</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button className="w-full">Ver Usuarios</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Gestión de Juegos
            </CardTitle>
            <CardDescription>Configurar juegos, límites de apuesta y disponibilidad</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/games">
              <Button className="w-full">Ver Juegos</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gestión de Balances
            </CardTitle>
            <CardDescription>Ajustar balances, procesar depósitos y retiros</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/balances">
              <Button className="w-full">Ver Balances</Button>
            </Link>
          </CardContent>
        </Card>

        {(role === UserRole.ADMIN || role === UserRole.CASHIER) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cargar Saldo
              </CardTitle>
              <CardDescription>Asignar fichas a un usuario</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLoadBalanceOpen(true)}>
                Cargar Saldo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ChipOperationDialog
        operationType="sell"
        open={loadBalanceOpen}
        onOpenChange={setLoadBalanceOpen}
        onSuccess={loadBalance}
      />
    </DashboardLayout>
  )
}
