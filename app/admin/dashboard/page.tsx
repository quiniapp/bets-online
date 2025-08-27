"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { mockUsers, mockBets, mockGameAccessRequests, Role } from "@/lib/mock-data"
import { Users, Gamepad2, DollarSign, TrendingUp, Clock, ArrowUp, ArrowDown } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import Link from "next/link"
import ROUTER from "@/routes"

export default function AdminDashboard() {
  const { user, role, isLoading } = useAuth() // ✅ Agregamos isLoading
  const router = useRouter()

  // ✅ Debug completo
  console.log("🏠 AdminDashboard - Current state:", { 
    user: user?.username, 
    role, 
    isLoading, // ✅ Mostrar estado de carga
    Role_admin: Role.admin,
    Role_superadmin: Role.superadmin,
    comparison1: role !== Role.admin,
    comparison2: role !== Role.superadmin,
    shouldRedirect: role !== Role.admin && role !== Role.superadmin
  });

  useEffect(() => {
    console.log("🔄 AdminDashboard useEffect triggered:", { role, isLoading });
    
    // ✅ Solo validar cuando ya terminó de cargar
    if (!isLoading) {
      if (role !== Role.admin && role !== Role.superadmin) {
        console.log("❌ Access denied, redirecting to home:", { role });
        router.push(ROUTER.SITE)
      } else {
        console.log("✅ Access granted:", { role });
      }
    } else {
      console.log("⏳ Still loading, waiting...");
    }
  }, [role, router, isLoading]) // ✅ Agregamos isLoading como dependencia

  // ✅ Mostrar loading mientras carga
  if (isLoading) {
    console.log("⏳ Showing loading state");
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  // ✅ Solo bloquear cuando ya terminó de cargar y no es admin/superadmin
  if (role !== Role.admin && role !== Role.superadmin) {
    console.log("🚫 Rendering blocked, role not allowed:", { role });
    return null
  }

  const activeUsers = mockUsers.filter((u) => u.isActive).length
  const totalBalance = mockUsers.reduce((sum, u) => sum + u.balance, 0)
  const pendingBets = mockBets.filter((b) => b.outcome === "pending").length
  const pendingRequests = mockGameAccessRequests.filter((r) => r.status === "pending").length

  const dailyRevenue = [
    { day: "Lun", revenue: 2400, bets: 45 },
    { day: "Mar", revenue: 1398, bets: 32 },
    { day: "Mié", revenue: 9800, bets: 78 },
    { day: "Jue", revenue: 3908, bets: 56 },
    { day: "Vie", revenue: 4800, bets: 89 },
    { day: "Sáb", revenue: 3800, bets: 67 },
    { day: "Dom", revenue: 4300, bets: 72 },
  ]

  const gamePopularity = [
    { name: "Blackjack", value: 35, color: "#8884d8" },
    { name: "Ruleta", value: 25, color: "#82ca9d" },
    { name: "Poker", value: 20, color: "#ffc658" },
    { name: "Slots", value: 15, color: "#ff7300" },
    { name: "Otros", value: 5, color: "#00ff88" },
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
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              +12% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              +8% esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apuestas Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBets}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
              -3% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">acceso a juegos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Diarios</CardTitle>
            <CardDescription>Ingresos y número de apuestas por día</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popularidad de Juegos</CardTitle>
            <CardDescription>Distribución de apuestas por tipo de juego</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gamePopularity}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {gamePopularity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad de Usuarios</CardTitle>
            <CardDescription>Usuarios activos por hora del día</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Apuestas por Día</CardTitle>
            <CardDescription>Número total de apuestas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bets" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
      </div>
    </DashboardLayout>
  )
}