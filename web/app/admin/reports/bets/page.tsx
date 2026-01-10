"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Bet } from "helper"
import { BetStatus } from "helper"

// Demo data - In production, this would come from API endpoints
const mockBets: Bet[] = []
const mockGames = [
  { id: "1", name: "Roulette" },
  { id: "2", name: "Blackjack" }
]
const mockUsers = [
  { id: "1", username: "user1" },
  { id: "2", username: "user2" }
]

export default function BetsReportPage() {
  const [bets] = useState<Bet[]>(mockBets)
  const [filterGame, setFilterGame] = useState<string>("all")
  const [filterOutcome, setFilterOutcome] = useState<string>("all")

  const filteredBets = bets.filter((bet) => {
    const matchesGame = filterGame === "all" || bet.gameId === filterGame
    const matchesOutcome = filterOutcome === "all" || bet.status === filterOutcome
    return matchesGame && matchesOutcome
  })

  const totalBets = bets.length
  const wonBets = bets.filter((b) => b.status === BetStatus.WON).length
  const lostBets = bets.filter((b) => b.status === BetStatus.LOST).length
  const pendingBets = bets.filter((b) => b.status === BetStatus.PENDING).length

  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0)
  const totalWinAmount = bets
    .filter((b) => b.status === BetStatus.WON)
    .reduce((sum, bet) => sum + bet.amount * (bet.multiplier || 1), 0)
  const houseEdge = totalBetAmount > 0 ? ((totalBetAmount - totalWinAmount) / totalBetAmount) * 100 : 0

  const getBadgeColor = (outcome: string) => {
    switch (outcome) {
      case BetStatus.WON:
        return "bg-green-500"
      case BetStatus.LOST:
        return "bg-red-500"
      case BetStatus.PENDING:
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Esta página usa datos de demostración. En producción, integrar con endpoints de API para estadísticas agregadas de apuestas.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reporte de Apuestas</h1>
            <p className="text-muted-foreground">Análisis detallado de todas las apuestas</p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Total Apuestas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBets}</div>
              <p className="text-xs text-muted-foreground">Todas las apuestas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                Apuestas Ganadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{wonBets}</div>
              <p className="text-xs text-muted-foreground">
                {totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                Apuestas Perdidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lostBets}</div>
              <p className="text-xs text-muted-foreground">
                {totalBets > 0 ? ((lostBets / totalBets) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                Apuestas Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingBets}</div>
              <p className="text-xs text-muted-foreground">
                {totalBets > 0 ? ((pendingBets / totalBets) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monto Total Apostado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBetAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado en Ganancias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalWinAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ventaja de la Casa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{houseEdge.toFixed(2)}%</div>
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
              <Select value={filterGame} onValueChange={setFilterGame}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por juego" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los juegos</SelectItem>
                  {mockGames.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los resultados</SelectItem>
                  <SelectItem value={BetStatus.WON}>Ganadas</SelectItem>
                  <SelectItem value={BetStatus.LOST}>Perdidas</SelectItem>
                  <SelectItem value={BetStatus.PENDING}>Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Apuestas</CardTitle>
            <CardDescription>{filteredBets.length} apuestas encontradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Juego</th>
                    <th className="text-left p-2">Monto</th>
                    <th className="text-left p-2">Multiplicador</th>
                    <th className="text-left p-2">Resultado</th>
                    <th className="text-left p-2">Ganancia</th>
                    <th className="text-left p-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBets.map((bet) => {
                    const user = mockUsers.find((u) => u.id === bet.userId)
                    const game = mockGames.find((g) => g.id === bet.gameId)
                    const winAmount = bet.status === BetStatus.WON ? bet.amount * (bet.multiplier || 1) : 0

                    return (
                      <tr key={bet.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-sm">{bet.id}</td>
                        <td className="p-2">{user?.username || "Usuario desconocido"}</td>
                        <td className="p-2">{game?.name || "Juego desconocido"}</td>
                        <td className="p-2">${bet.amount.toFixed(2)}</td>
                        <td className="p-2">{bet.multiplier ? `${bet.multiplier}x` : "-"}</td>
                        <td className="p-2">
                          <Badge className={getBadgeColor(bet.status)}>{bet.status}</Badge>
                        </td>
                        <td className="p-2">
                          {bet.status === BetStatus.WON ? (
                            <span className="text-green-600">${winAmount.toFixed(2)}</span>
                          ) : bet.status === BetStatus.LOST ? (
                            <span className="text-red-600">$0.00</span>
                          ) : (
                            <span className="text-yellow-600">Pendiente</span>
                          )}
                        </td>
                        <td className="p-2">{bet.createdAt.toLocaleDateString()}</td>
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
