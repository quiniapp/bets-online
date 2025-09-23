"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { mockGames, mockBets, mockTransactions, type User, Role } from "@/lib/mock-data"
import { UserIcon, Gamepad2, History, TrendingUp } from "lucide-react"
import Link from "next/link"
import ROUTER from "@/routes"

export default function UserDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
   
    if (!isLoading) {
      if (role !== Role.user) {
        console.log("❌ User dashboard - Access denied, redirecting:", { role });
        router.push(ROUTER.SITE) 
      } else {
        console.log("✅ User dashboard - Access granted:", { role });
      }
    } else {
      console.log("⏳ User dashboard - Still loading...");
    }
  }, [role, router, isLoading])


  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  if (role !== Role.user || !user) {

    return null
  }

  const currentUser = user as User
  const userBets = mockBets.filter((bet) => bet.userId === currentUser.id)
  const userTransactions = mockTransactions.filter((tx) => tx.userId === currentUser.id)
  const availableGames = mockGames.filter((game) => game.isActive && currentUser.enabledGames.includes(game.id))

  const totalWinnings = userBets
    .filter((bet) => bet.outcome === "won")
    .reduce((sum, bet) => sum + bet.amount * (bet.multiplier || 1), 0)

  const totalLosses = userBets.filter((bet) => bet.outcome === "lost").reduce((sum, bet) => sum + bet.amount, 0)

  return (
    <DashboardLayout title="Mi Dashboard">
      {/* Balance Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Balance Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600 mb-4">${currentUser.balance.toFixed(2)}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total ganado:</span>
              <div className="font-semibold text-green-600">+${totalWinnings.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total perdido:</span>
              <div className="font-semibold text-red-600">-${totalLosses.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Apuestas activas:</span>
              <div className="font-semibold">{userBets.filter((b) => b.outcome === "pending").length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="h-5 w-5" />
              Mi Perfil
            </CardTitle>
            <CardDescription>Ver y editar información personal</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/user/profile">
              <Button className="w-full">Ver Perfil</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-5 w-5" />
              Casino
            </CardTitle>
            <CardDescription>Acceder a juegos disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/user/games">
              <Button className="w-full">Jugar Ahora</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Mis Apuestas
            </CardTitle>
            <CardDescription>Historial de apuestas y resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/user/bets">
              <Button className="w-full">Ver Apuestas</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Transacciones
            </CardTitle>
            <CardDescription>Historial de depósitos y retiros</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/user/transactions">
              <Button className="w-full">Ver Historial</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Available Games */}
      <Card>
        <CardHeader>
          <CardTitle>Juegos Disponibles</CardTitle>
          <CardDescription>Juegos a los que tienes acceso actualmente</CardDescription>
        </CardHeader>
        <CardContent>
          {availableGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableGames.map((game) => (
                <div key={game.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{game.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{game.description}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span>Min: ${game.minBet}</span>
                    <span>Max: ${game.maxBet}</span>
                  </div>
                  <Button size="sm" className="w-full">
                    Jugar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No tienes acceso a ningún juego actualmente. Contacta al administrador.
            </p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}