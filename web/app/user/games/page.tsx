"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Play, DollarSign, Loader2, ExternalLink, Gamepad2, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { useGames } from "@/hooks/useGames"
import { useBets } from "@/hooks/useBets"
import { useChips } from "@/hooks/useChips"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "helper"
import { cn } from "@/lib/utils"

export default function UserGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { games, loading: loadingGames } = useGames(true)
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
      const response = await placeBet({ gameId: selectedGame.id, amount })

      if (response.success && response.data) {
        const { bet } = response.data
        loadBalance()

        const isWin = bet.status === "WON"
        toast({
          title: isWin ? "¡Ganaste!" : "Perdiste",
          description: isWin
            ? `Multiplicador: ${bet.multiplier?.toFixed(2)}x - Ganancia: $${bet.payout?.toFixed(2)}`
            : `Perdiste $${bet.amount.toFixed(2)}`,
          variant: isWin ? "default" : "destructive",
        })
        setBetAmount("")
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo realizar la apuesta",
          variant: "destructive",
        })
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo realizar la apuesta",
        variant: "destructive",
      })
    } finally {
      setPlacing(false)
    }
  }

  const getStatusBadge = (status: string): "default" | "destructive" | "secondary" => {
    if (status === "WON") return "default"
    if (status === "LOST") return "destructive"
    return "secondary"
  }

  const getStatusLabel = (bet: { status: string; multiplier?: number | null }) => {
    if (bet.status === "WON" && bet.multiplier) return `${bet.multiplier.toFixed(2)}x`
    if (bet.status === "LOST") return "Perdió"
    return "Pendiente"
  }

  return (
    <DashboardLayout title="Casino">
      {/* Mobile/Desktop layout: on mobile column (panel first), on lg side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Panel: balance + bet form + recent bets — first in DOM = top on mobile */}
        <div className="lg:col-start-3 lg:row-start-1 space-y-4">

          {/* Balance */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              {balance ? (
                <p className="text-xl font-bold text-primary">${balance.chipBalance.toFixed(2)}</p>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cargando...</span>
                </div>
              )}
            </div>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>

          {/* Bet form */}
          {selectedGame && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Apostar en {selectedGame.name}</CardTitle>
                  <button
                    onClick={() => { setSelectedGame(null); setBetAmount("") }}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="betAmount" className="text-xs">Cantidad</Label>
                  <Input
                    id="betAmount"
                    type="number"
                    step="0.01"
                    min={selectedGame.minBet}
                    max={selectedGame.maxBet}
                    placeholder={`${selectedGame.minBet} – ${selectedGame.maxBet}`}
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={placing}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Límites: ${selectedGame.minBet} – ${selectedGame.maxBet}
                  </p>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[selectedGame.minBet, selectedGame.minBet * 2, selectedGame.minBet * 5, selectedGame.maxBet].map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      className="text-xs px-0"
                      onClick={() => setBetAmount(String(amt))}
                      disabled={placing}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={handlePlaceBet}
                  disabled={!betAmount || placing || !balance}
                  className="w-full font-semibold"
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

          {/* Recent bets */}
          {bets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Apuestas recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bets.slice(0, 5).map((bet) => {
                  const game = games.find((g) => g.id === bet.gameId)
                  return (
                    <div key={bet.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-medium truncate">{game?.name ?? "Juego"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          ${bet.amount.toFixed(2)} · {new Date(bet.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={getStatusBadge(bet.status)} className="text-[10px] shrink-0">
                        {getStatusLabel(bet)}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Games grid — second in DOM = below panel on mobile, left column on desktop */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Juegos disponibles
          </h2>

          {loadingGames ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {games.map((game) => {
                const isProviderGame = !!game.providerGameId
                const isSelected = selectedGame?.id === game.id

                return (
                  <div
                    key={game.id}
                    className={cn(
                      "group rounded-xl border overflow-hidden transition-all",
                      isProviderGame
                        ? "border-border"
                        : "cursor-pointer",
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => { if (!isProviderGame) setSelectedGame(isSelected ? null : game) }}
                  >
                    {game.defaultLogo ? (
                      <img
                        src={game.defaultLogo}
                        alt={game.name}
                        className="w-full h-28 md:h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-28 md:h-32 bg-muted flex items-center justify-center">
                        <Gamepad2 className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="text-xs font-semibold leading-tight truncate">{game.name}</p>
                        {isProviderGame ? (
                          <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Play className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        )}
                      </div>

                      {isProviderGame ? (
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={(e) => { e.stopPropagation(); router.push(`/user/games/${game.id}/play`) }}
                        >
                          <Play className="mr-1.5 h-3 w-3" />
                          Jugar
                        </Button>
                      ) : (
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Min: ${game.minBet}</span>
                          <span>Max: ${game.maxBet}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loadingGames && games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay juegos disponibles</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Contacta al administrador</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
