"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { mockGames, mockBets, type User, type Bet } from "@/lib/mock-data"
import { ArrowLeft, Play, DollarSign } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function UserGames() {
  const { user, role } = useAuth()
  const router = useRouter()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState("")
  const [bets, setBets] = useState<Bet[]>(mockBets)



  const currentUser = user as User
  const availableGames = mockGames.filter((game) => game.isActive && currentUser.enabledGames.includes(game.id))

  const selectedGameData = mockGames.find((g) => g.id === selectedGame)

  const placeBet = () => {
    if (!selectedGame || !betAmount || !selectedGameData) return

    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount < selectedGameData.minBet || amount > selectedGameData.maxBet) {
      alert("Cantidad de apuesta inválida")
      return
    }

    if (amount > currentUser.balance) {
      alert("Balance insuficiente")
      return
    }

    const newBet: Bet = {
      id: `bet${Date.now()}`,
      userId: currentUser.id,
      gameId: selectedGame,
      amount: amount,
      outcome: "pending",
      createdAt: new Date(),
    }

    setBets((prev) => [newBet, ...prev])
    setBetAmount("")

    // Simulate random outcome after 3 seconds
    setTimeout(() => {
      const outcomes = ["won", "lost"] as const
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)]
      const multiplier = randomOutcome === "won" ? Math.random() * 3 + 1 : undefined

      setBets((prev) =>
        prev.map((bet) =>
          bet.id === newBet.id ? { ...bet, outcome: randomOutcome, multiplier, settledAt: new Date() } : bet,
        ),
      )
    }, 3000)
  }

  const userBets = bets.filter((bet) => bet.userId === currentUser.id).slice(0, 5)

  return (
    <DashboardLayout title="Mi Dashboard">
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/user/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Juegos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Games List */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Juegos Disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableGames.map((game) => (
                  <Card
                    key={game.id}
                    className={`cursor-pointer transition-all ${
                      selectedGame === game.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedGame(game.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {game.name}
                        <Play className="h-5 w-5" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-3">{game.description}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Min: ${game.minBet}</span>
                        <span>Max: ${game.maxBet}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {availableGames.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No tienes acceso a ningún juego actualmente.</p>
                  <p className="text-sm text-gray-400 mt-2">Contacta al administrador para solicitar acceso.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Betting Panel */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${currentUser.balance.toFixed(2)}</div>
              </CardContent>
            </Card>

            {selectedGameData && (
              <Card>
                <CardHeader>
                  <CardTitle>Apostar en {selectedGameData.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="betAmount">Cantidad a apostar</Label>
                    <Input
                      id="betAmount"
                      type="number"
                      step="0.01"
                      min={selectedGameData.minBet}
                      max={Math.min(selectedGameData.maxBet, currentUser.balance)}
                      placeholder={`${selectedGameData.minBet} - ${selectedGameData.maxBet}`}
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Límites: ${selectedGameData.minBet} - ${selectedGameData.maxBet}
                    </p>
                  </div>

                  <Button
                    onClick={placeBet}
                    disabled={!betAmount || Number.parseFloat(betAmount) > currentUser.balance}
                    className="w-full"
                  >
                    Apostar ${betAmount || "0.00"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Bets */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Apuestas Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userBets.map((bet) => {
                    const game = mockGames.find((g) => g.id === bet.gameId)
                    return (
                      <div key={bet.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{game?.name}</p>
                          <p className="text-sm text-gray-500">
                            ${bet.amount.toFixed(2)} • {bet.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            bet.outcome === "won" ? "default" : bet.outcome === "lost" ? "destructive" : "secondary"
                          }
                        >
                          {bet.outcome === "won" && bet.multiplier
                            ? `Ganó ${bet.multiplier.toFixed(1)}x`
                            : bet.outcome === "lost"
                              ? "Perdió"
                              : "Pendiente"}
                        </Badge>
                      </div>
                    )
                  })}
                  {userBets.length === 0 && <p className="text-gray-500 text-center py-4">No hay apuestas recientes</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
    </DashboardLayout>
  )
}
