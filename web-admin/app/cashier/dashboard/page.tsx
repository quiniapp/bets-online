"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import { Users, DollarSign, Loader2, UserPlus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChipLoadDialog } from "@/components/admin/chip-load-dialog"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
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

export default function CashierDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { balance: myBalance, loadBalance } = useChips()
  const [loadBalanceOpen, setLoadBalanceOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.CASHIER) {
        router.push(ROUTER.SITE)
      }
    }
  }, [role, router, isLoading])

  useEffect(() => {
    if (user && role === UserRole.CASHIER) {
      loadBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

  useEffect(() => {
    if (!user) return
    setLoadingStats(true)
    const controller = new AbortController()
    apiService.get<UserStats>('/users/me/stats').then(res => {
      if (controller.signal.aborted) return
      if (res.success && res.data) setUserStats(res.data)
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

  if (role !== UserRole.CASHIER) {
    return null
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

        <Card className="gap-2 py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
            <CardTitle className="text-lg font-semibold">Crear Usuario</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-sm text-muted-foreground mb-3">
              Registrar nuevos cajeros y jugadores
            </p>
            <div className="flex">
              <Button size="sm" className="w-full" onClick={() => router.push(ROUTER.CASHIER_CREATE_USER)}>
                <UserPlus className="h-3 w-3 mr-1" />
                Crear Usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
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

      <ChipLoadDialog
        open={loadBalanceOpen}
        onOpenChange={setLoadBalanceOpen}
        onSuccess={loadBalance}
      />
    </DashboardLayout>
  )
}
