"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Play, DollarSign, Loader2, ExternalLink } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { useGames } from "@/hooks/useGames"
import { useBets } from "@/hooks/useBets"
import { useChips } from "@/hooks/useChips"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "helper"

export default function UserGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { games, loading: loadingGames } = useGames(true) // Only active games
  const { bets, placeBet, loadBets } = useBets()
  const { balance, loadBalance } = useChips()

  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [betAmount, setBetAmount] = useState("")
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (user) {
      loadBalance()
      loadBets({ limit: 5 })
    }
  }, [user])

  if (!user) return null

  const handlePlaceBet = async () => {
    if (!selectedGame || !betAmount) return

    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount < selectedGame.minBet || amount > selectedGame.maxBet) {
      toast({
        title: "Cantidad inválida",
        description: `La apuesta debe estar entre $${selectedGame.minBet} y $${selectedGame.maxBet}`,
        variant: "destructive",
      })
      return
    }

    if (balance && amount > balance.chipBalance) {
      toast({
        title: "Balance insuficiente",
        description: `No tienes suficiente saldo. Balance actual: $${balance.chipBalance}`,
        variant: "destructive",
      })
      return
    }

    setPlacing(true)
    try {
      const response = await placeBet({
        gameId: selectedGame.id,
        amount: amount,
      })

      if (response.success && response.data) {
        const { bet } = response.data

        // Update balance
        loadBalance()

        // Show result
        const isWin = bet.status === "WON"
        toast({
          title: isWin ? "¡Ganaste!" : "Perdiste",
          description: isWin
            ? `Multiplicador: ${bet.multiplier?.toFixed(2)}x - Ganancia: $${bet.payout?.toFixed(2)}`
            : `Perdiste $${bet.amount.toFixed(2)}`,
          variant: isWin ? "default" : "destructive",
        })

        // Clear bet amount
        setBetAmount("")
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo realizar la apuesta",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la apuesta",
        variant: "destructive",
      })
    } finally {
      setPlacing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WON":
        return "default"
      case "LOST":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (bet: any) => {
    if (bet.status === "WON" && bet.multiplier) {
      return `Ganó ${bet.multiplier.toFixed(2)}x`
    }
    if (bet.status === "LOST") {
      return "Perdió"
    }
    return "Pendiente"
  }

  return (
    <DashboardLayout title="Casino">
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Games List */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Juegos Disponibles</h2>

                {loadingGames ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {games.map((game) => {
                      const isProviderGame = !!game.providerGameId
                      return (
                        <Card
                          key={game.id}
                          className={`transition-all ${
                            isProviderGame
                              ? "cursor-default"
                              : `cursor-pointer ${selectedGame?.id === game.id ? "ring-2 ring-blue-500" : ""}`
                          }`}
                          onClick={() => { if (!isProviderGame) setSelectedGame(game) }}
                        >
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              {game.name}
                              {isProviderGame ? (
                                <ExternalLink className="h-5 w-5 text-primary" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {game.defaultLogo && (
                              <img
                                src={game.defaultLogo}
                                alt={game.name}
                                className="w-full h-28 object-cover rounded-md mb-3"
                              />
                            )}
                            <p className="text-gray-600 mb-3">{game.description}</p>
                            {isProviderGame ? (
                              <Button
                                className="w-full"
                                onClick={() => router.push(`/user/games/${game.id}/play`)}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Jugar
                              </Button>
                            ) : (
                              <>
                                <div className="flex justify-between text-sm text-gray-500">
                                  <span>Min: ${game.minBet}</span>
                                  <span>Max: ${game.maxBet}</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                  House Edge: {game.houseEdge}%
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {!loadingGames && games.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">No hay juegos disponibles actualmente.</p>
                      <p className="text-sm text-gray-400 mt-2">Contacta al administrador.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
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
                  {balance ? (
                    <>
                      <div className="text-2xl font-bold text-green-600">
                        ${balance.chipBalance.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actualizado: {new Date(balance.lastUpdatedAt).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-500">Cargando balance...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedGame && (
                <Card>
                  <CardHeader>
                    <CardTitle>Apostar en {selectedGame.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="betAmount">Cantidad a apostar</Label>
                      <Input
                        id="betAmount"
                        type="number"
                        step="0.01"
                        min={selectedGame.minBet}
                        max={selectedGame.maxBet}
                        placeholder={`${selectedGame.minBet} - ${selectedGame.maxBet}`}
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        disabled={placing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Límites: ${selectedGame.minBet} - ${selectedGame.maxBet}
                      </p>
                    </div>

                    <Button
                      onClick={handlePlaceBet}
                      disabled={!betAmount || placing || !balance}
                      className="w-full"
                    >
                      {placing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Apostando...
                        </>
                      ) : (
                        `Apostar $${betAmount || "0.00"}`
                      )}
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
                    {bets.slice(0, 5).map((bet) => {
                      const game = games.find((g) => g.id === bet.gameId)
                      return (
                        <div key={bet.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{game?.name || "Unknown Game"}</p>
                            <p className="text-sm text-gray-500">
                              ${bet.amount.toFixed(2)} • {new Date(bet.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <Badge variant={getStatusBadge(bet.status)}>
                            {getStatusLabel(bet)}
                          </Badge>
                        </div>
                      )
                    })}
                    {bets.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay apuestas recientes</p>
                    )}
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
