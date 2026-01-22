"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import { UserIcon, Gamepad2, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import ROUTER from "@/routes"
import { useChips } from "@/hooks/useChips"
import { useBets } from "@/hooks/useBets"
import { useGames } from "@/hooks/useGames"

export default function UserDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { balance, loadBalance } = useChips()
  const { bets, statistics, loadBets, loadStatistics } = useBets()
  const { games } = useGames(true)

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.PLAYER) {
        console.log("❌ User dashboard - Access denied, redirecting:", { role });
        router.push(ROUTER.SITE)
      } else {
        console.log("✅ User dashboard - Access granted:", { role });
      }
    }
  }, [role, router, isLoading])

  useEffect(() => {
    if (user && role === UserRole.PLAYER) {
      loadBalance()
      loadBets({ limit: 10 })
      loadStatistics()
    }
  }, [user, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (role !== UserRole.PLAYER || !user) {
    return null
  }

  const pendingBets = bets.filter((b) => b.status === "PENDING").length

  return (
    <DashboardLayout title="Mi Dashboard">
      {/* Balance Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Balance Actual</CardTitle>
        </CardHeader>
        <CardContent>
          {balance ? (
            <>
              <div className="text-4xl font-bold text-green-600 mb-4">
                ${balance.chipBalance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Actualizado: {new Date(balance.lastUpdatedAt).toLocaleString()}
              </p>
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total ganado:</span>
                    <div className="font-semibold text-green-600">
                      +${statistics.totalPayout.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total apostado:</span>
                    <div className="font-semibold text-gray-600">
                      ${statistics.totalWagered.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ganancia neta:</span>
                    <div
                      className={`font-semibold ${statistics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {statistics.netProfit >= 0 ? "+" : ""}${statistics.netProfit.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Cargando balance...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
      </div>

      {/* Statistics Card */}
      {statistics && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estadísticas de Apuestas</CardTitle>
            <CardDescription>Resumen de tu actividad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Total Apuestas</span>
                <div className="text-2xl font-bold">{statistics.totalBets}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Ganadas</span>
                <div className="text-2xl font-bold text-green-600">{statistics.wonBets}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Perdidas</span>
                <div className="text-2xl font-bold text-red-600">{statistics.lostBets}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <div className="text-2xl font-bold">{statistics.winRate.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Games */}
      <Card>
        <CardHeader>
          <CardTitle>Juegos Disponibles</CardTitle>
          <CardDescription>Juegos activos en el casino</CardDescription>
        </CardHeader>
        <CardContent>
          {games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => (
                <div key={game.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{game.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{game.description}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span>Min: ${game.minBet}</span>
                    <span>Max: ${game.maxBet}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    House Edge: {game.houseEdge}%
                  </div>
                  <Link href="/user/games">
                    <Button size="sm" className="w-full">
                      Jugar
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay juegos disponibles actualmente.
            </p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
