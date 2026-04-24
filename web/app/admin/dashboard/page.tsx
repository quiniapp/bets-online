"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import { Users, Gamepad2, DollarSign, Loader2, TrendingUp } from "lucide-react"
import { ChipOperationDialog } from "@/components/admin/chip-operation-dialog"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import Link from "next/link"
import ROUTER from "@/routes"
import { useChips } from "@/hooks/useChips"
import { formatChips } from "@/lib/utils"
import { apiService } from "@/services/api.service"

interface UserStats {
  total: number
  active: number
  blocked: number
  admins: number
  cashiers: number
  players: number
}

interface GameStats {
  total: number
  active: number
}

interface TopGame {
  id: string
  name: string
  isActive: boolean
  betCount: number
}

export default function AdminDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { balance: myBalance, loadBalance } = useChips()
  const [loadBalanceOpen, setLoadBalanceOpen] = useState(false)

  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [topGames, setTopGames] = useState<TopGame[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.OWNER && role !== UserRole.ADMIN && role !== UserRole.CASHIER) {
        router.push(ROUTER.SITE)
      }
    }
  }, [role, router, isLoading])

  useEffect(() => {
    if (user && (role === UserRole.ADMIN || role === UserRole.CASHIER)) {
      loadBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

  useEffect(() => {
    if (!user) return
    setLoadingStats(true)
    Promise.all([
      apiService.get<UserStats>('/users/me/stats'),
      apiService.get<GameStats>('/games/stats'),
      apiService.get<TopGame[]>('/games/top-played?limit=5'),
    ]).then(([uRes, gRes, tRes]) => {
      if (uRes.success && uRes.data) setUserStats(uRes.data)
      if (gRes.success && gRes.data) setGameStats(gRes.data)
      if (tRes.success && tRes.data) setTopGames(tRes.data)
    }).finally(() => setLoadingStats(false))
  }, [user])

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

  // Demo chart data
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
    <DashboardLayout title="Inicio">
      {/* Stats Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === UserRole.OWNER ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        {/* Total Usuarios + Distribución — clickable */}
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => router.push(ROUTER.ADMIN_USERS)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div>
                  <div className="text-2xl font-bold">{userStats?.total ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {userStats?.active ?? 0} activos, {userStats?.blocked ?? 0} bloqueados
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-blue-500">{userStats?.admins ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Admins</span>
                  </div>
                  <div className="text-muted-foreground/40">·</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-orange-500">{userStats?.cashiers ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Cajeros</span>
                  </div>
                  <div className="text-muted-foreground/40">·</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-green-500">{userStats?.players ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Jugadores</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Juegos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Juegos</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">{gameStats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {gameStats?.active ?? 0} activos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mi Balance — solo ADMIN/CASHIER */}
        {(role === UserRole.ADMIN || role === UserRole.CASHIER) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mi Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {myBalance ? (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    ${formatChips(myBalance.chipBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(myBalance.lastUpdatedAt).toLocaleString('es-ES')}
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
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos Diarios</CardTitle>
            <CardDescription>Ingresos y apuestas por día (Demo)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
            <CardTitle className="text-base">Actividad de Usuarios</CardTitle>
            <CardDescription>Usuarios activos por hora (Demo)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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

      {/* Top Juegos Más Jugados */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Juegos Más Jugados</CardTitle>
              <CardDescription>Ordenado por cantidad de rondas</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : topGames.length > 0 ? (
            <div className="space-y-2">
              {topGames.map((game, index) => (
                <div
                  key={game.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{game.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {game.betCount} rondas jugadas
                    </p>
                  </div>
                  <Badge variant={game.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
                    {game.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              ))}
              <Link href="/admin/games">
                <Button variant="outline" className="w-full mt-2">
                  Ver todos los juegos
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay datos de juegos</p>
              <Link href="/admin/games">
                <Button>Ver Juegos</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Gestión de Usuarios
            </CardTitle>
            <CardDescription>Administrar cuentas, balances y permisos</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button className="w-full">Ver Usuarios</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gamepad2 className="h-4 w-4" />
              Gestión de Juegos
            </CardTitle>
            <CardDescription>Configurar juegos, límites y disponibilidad</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/games">
              <Button className="w-full">Ver Juegos</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Gestión de Balances
            </CardTitle>
            <CardDescription>Ajustar balances, depósitos y retiros</CardDescription>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
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
