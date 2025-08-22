"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockGames, mockBets, type User } from "@/lib/mock-data"
import { ArrowLeft, TrendingUp, TrendingDown, Clock } from "lucide-react"
import Link from "next/link"

export default function UserBets() {
  const { user, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (role !== "user") {
      router.push("/user/login")
    }
  }, [role, router])

  if (role !== "user" || !user) return null

  const currentUser = user as User
  const userBets = mockBets.filter((bet) => bet.userId === currentUser.id)

  const wonBets = userBets.filter((bet) => bet.outcome === "won")
  const lostBets = userBets.filter((bet) => bet.outcome === "lost")
  const pendingBets = userBets.filter((bet) => bet.outcome === "pending")

  const totalWinnings = wonBets.reduce((sum, bet) => sum + bet.amount * (bet.multiplier || 1), 0)
  const totalLosses = lostBets.reduce((sum, bet) => sum + bet.amount, 0)

  const getGameName = (gameId: string) => {
    return mockGames.find((g) => g.id === gameId)?.name || "Juego desconocido"
  }

  const getBetStatusIcon = (outcome: string) => {
    switch (outcome) {
      case "won":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "lost":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/user/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Mis Apuestas</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Apuestas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{wonBets.length}</div>
              <p className="text-xs text-muted-foreground">+${totalWinnings.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perdidas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lostBets.length}</div>
              <p className="text-xs text-muted-foreground">-${totalLosses.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingBets.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bets List */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Apuestas</CardTitle>
          </CardHeader>
          <CardContent>
            {userBets.length > 0 ? (
              <div className="space-y-4">
                {userBets.map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getBetStatusIcon(bet.outcome)}
                      <div>
                        <h3 className="font-semibold">{getGameName(bet.gameId)}</h3>
                        <p className="text-sm text-gray-600">
                          {bet.createdAt.toLocaleDateString()} • {bet.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">Apostado: ${bet.amount.toFixed(2)}</div>
                      {bet.outcome === "won" && bet.multiplier && (
                        <div className="text-green-600 text-sm">
                          Ganado: ${(bet.amount * bet.multiplier).toFixed(2)} ({bet.multiplier.toFixed(1)}x)
                        </div>
                      )}
                      {bet.outcome === "lost" && (
                        <div className="text-red-600 text-sm">Perdido: ${bet.amount.toFixed(2)}</div>
                      )}
                      <Badge
                        variant={
                          bet.outcome === "won" ? "default" : bet.outcome === "lost" ? "destructive" : "secondary"
                        }
                        className="mt-1"
                      >
                        {bet.outcome === "won" ? "Ganada" : bet.outcome === "lost" ? "Perdida" : "Pendiente"}
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
  )
}
