"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import { Users, Gamepad2, DollarSign, Loader2, TrendingUp, Wifi, UserPlus, Activity } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChipOperationDialog } from "@/components/admin/chip-operation-dialog"
import { ChipLoadDialog } from "@/components/admin/chip-load-dialog"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import Link from "next/link"
import ROUTER from "@/routes"
import { useChips } from "@/hooks/useChips"
import { useAdminStats } from "@/hooks/useAdminStats"
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
  totalWagered: number
}

export default function AdminDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { balance: myBalance, loadBalance } = useChips()
  const [loadBalanceOpen, setLoadBalanceOpen] = useState(false)
  const [chipLoadOpen, setChipLoadOpen] = useState(false)

  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [topGames, setTopGames] = useState<TopGame[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const { stats: adminStats, loading: loadingAdminStats } = useAdminStats()

  useEffect(() => {
    if (!isLoading) {
      if (role === UserRole.CASHIER) {
        router.push(ROUTER.CASHIER_DASHBOARD)
      } else if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
        router.push(ROUTER.SITE)
      }
    }
  }, [role, router, isLoading])

  useEffect(() => {
    if (user && role === UserRole.ADMIN) {
      loadBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

  useEffect(() => {
    if (!user) return
    setLoadingStats(true)
    const controller = new AbortController()
    Promise.all([
      apiService.get<UserStats>('/users/me/stats'),
      apiService.get<GameStats>('/games/stats'),
      apiService.get<TopGame[]>('/games/top-played?limit=5'),
    ]).then(([uRes, gRes, tRes]) => {
      if (controller.signal.aborted) return
      if (uRes.success && uRes.data) setUserStats(uRes.data)
      if (gRes.success && gRes.data) setGameStats(gRes.data)
      if (tRes.success && tRes.data) setTopGames(tRes.data)
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingStats(false)
    })
    return () => controller.abort()
  }, [user?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
    return null
  }

  // Demo chart data (fallback while real data loads)
  const dailyRevenue = [
    { day: "Lun", loaded: 2400, withdrawn: 45 },
    { day: "Mar", loaded: 1398, withdrawn: 32 },
    { day: "Mié", loaded: 9800, withdrawn: 78 },
    { day: "Jue", loaded: 3908, withdrawn: 56 },
    { day: "Vie", loaded: 4800, withdrawn: 89 },
    { day: "Sáb", loaded: 3800, withdrawn: 67 },
    { day: "Dom", loaded: 4300, withdrawn: 72 },
  ]

  const weeklyData = adminStats?.weeklyChipFlow?.map(d => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' }),
    loaded: d.loaded,
    withdrawn: d.withdrawn,
  })) ?? dailyRevenue

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Total Usuarios + Distribución — clickable */}
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md gap-2 py-4"
          onClick={() => router.push(ROUTER.ADMIN_USERS)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">Total Usuarios</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            {loadingStats ? (
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-4xl font-bold text-green-600">{userStats?.active ?? 0}</div>
                  <p className="text-sm text-muted-foreground">activos (7d)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {userStats?.total ?? 0} total · {userStats?.blocked ?? 0} bloqueados
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm text-muted-foreground">Admins</span>
                    <span className="text-base font-bold text-blue-500 w-6 text-right">{userStats?.admins ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm text-muted-foreground">Cajeros</span>
                    <span className="text-base font-bold text-orange-500 w-6 text-right">{userStats?.cashiers ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm text-muted-foreground">Jugadores</span>
                    <span className="text-base font-bold text-green-500 w-6 text-right">{userStats?.players ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Juegos */}
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md gap-2 py-4"
          onClick={() => router.push(ROUTER.ADMIN_GAMES)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">Juegos Activos</CardTitle>
            <Gamepad2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            {loadingStats ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-green-600">{gameStats?.active ?? 0}</div>

                <p className="text-base text-muted-foreground mt-1">
                  {gameStats?.total ?? 0} totales
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Gestión de Balances — solo OWNER */}
        {role === UserRole.OWNER && (
          <Card className="gap-2 py-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
              <CardTitle className="text-lg font-semibold">Gestión de Balances</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5">
              <p className="text-base text-muted-foreground mb-3">
                Asignar y retirar fichas a usuarios
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push(ROUTER.ADMIN_BALANCES)}>
                  Ver Balances
                </Button>
                <Button size="sm" onClick={() => setChipLoadOpen(true)}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  Cargar Fichas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mi Balance — solo ADMIN */}
        {role === UserRole.ADMIN && (
          <Card className="gap-2 py-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
              <CardTitle className="text-lg font-semibold">Mi Balance</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5">
              {myBalance ? (
                <>
                  <div className="text-4xl font-bold text-green-600">
                    ${formatChips(myBalance.chipBalance)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
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

        {/* En línea ahora */}
        <Card className="gap-2 py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">En línea ahora</CardTitle>
            <Wifi className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            {loadingAdminStats ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-green-600">{adminStats?.onlineNow ?? 0}</div>
                <Badge variant="outline" className="mt-2 text-green-600 border-green-300">En línea</Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nuevos hoy */}
        <Card className="gap-2 py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">Nuevos hoy</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            {loadingAdminStats ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-blue-600">{adminStats?.newUsersToday ?? 0}</div>
                <Badge variant="outline" className="mt-2 text-blue-600 border-blue-300">Registros hoy</Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activos hoy */}
        <Card className="gap-2 py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">Activos hoy</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            {loadingAdminStats ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-orange-600">{adminStats?.activeUsersToday ?? 0}</div>
                <Badge variant="outline" className="mt-2 text-orange-600 border-orange-300">Activos hoy</Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flujo de Fichas Semanal</CardTitle>
            <CardDescription>Fichas cargadas y retiradas por día</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="loaded" fill="#8884d8" name="Cargadas" />
                <Bar yAxisId="right" dataKey="withdrawn" fill="#82ca9d" name="Retiradas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad de Usuarios</CardTitle>
            <CardDescription>Actividad por hora — próximamente</CardDescription>
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
                      {game.betCount} rondas · ${formatChips(game.totalWagered)} apostados
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


      <ChipOperationDialog
        operationType="sell"
        open={loadBalanceOpen}
        onOpenChange={setLoadBalanceOpen}
        onSuccess={loadBalance}
      />
      <ChipLoadDialog
        open={chipLoadOpen}
        onOpenChange={setChipLoadOpen}
      />
    </DashboardLayout>
  )
}
