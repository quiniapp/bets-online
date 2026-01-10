"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useBets } from "@/hooks/useBets"
import { useGames } from "@/hooks/useGames"

export default function UserBets() {
  const { user } = useAuth()
  const { bets, statistics, loading, loadBets, loadStatistics } = useBets()
  const { games } = useGames(true)

  useEffect(() => {
    if (user) {
      loadBets({ limit: 50 })
      loadStatistics()
    }
  }, [user])

  if (!user) return null

  const getGameName = (gameId: string) => {
    return games.find((g) => g.id === gameId)?.name || "Juego desconocido"
  }

  const getBetStatusIcon = (status: string) => {
    switch (status) {
      case "WON":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "LOST":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "WON":
        return "Ganada"
      case "LOST":
        return "Perdida"
      case "PENDING":
        return "Pendiente"
      case "CANCELLED":
        return "Cancelada"
      default:
        return status
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "WON":
        return "default"
      case "LOST":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <DashboardLayout title="Favoritos">
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          {loading && !statistics ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : statistics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Apuestas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalBets}</div>
                  <p className="text-xs text-muted-foreground">
                    Total apostado: ${statistics.totalWagered.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganadas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.wonBets}</div>
                  <p className="text-xs text-muted-foreground">
                    +${statistics.totalPayout.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Perdidas</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{statistics.lostBets}</div>
                  <p className="text-xs text-muted-foreground">Win rate: {statistics.winRate.toFixed(1)}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${statistics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ${statistics.netProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.netProfit >= 0 ? "Ganancia" : "Pérdida"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Bets List */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Apuestas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && bets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : bets.length > 0 ? (
                <div className="space-y-4">
                  {bets.map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getBetStatusIcon(bet.status)}
                        <div>
                          <h3 className="font-semibold">{getGameName(bet.gameId)}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(bet.createdAt).toLocaleDateString()} •{" "}
                            {new Date(bet.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">Apostado: ${bet.amount.toFixed(2)}</div>
                        {bet.status === "WON" && bet.multiplier && bet.payout && (
                          <div className="text-green-600 text-sm">
                            Ganado: ${bet.payout.toFixed(2)} ({bet.multiplier.toFixed(2)}x)
                          </div>
                        )}
                        {bet.status === "LOST" && (
                          <div className="text-red-600 text-sm">Perdido: ${bet.amount.toFixed(2)}</div>
                        )}
                        <Badge variant={getStatusVariant(bet.status)} className="mt-1">
                          {getStatusLabel(bet.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No has realizado ninguna apuesta aún.</p>
                  <Link href="/user/games">
                    <Button className="mt-4">Ir a Juegos</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </DashboardLayout>
  )
}
