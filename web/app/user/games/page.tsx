"use client"

import { useAuth } from "@/contexts/auth-context"
import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Play, Loader2, Gamepad2, X, Heart, Search } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useGames } from "@/hooks/useGames"
import { useBets } from "@/hooks/useBets"
import { useChips } from "@/hooks/useChips"
import { useProviders } from "@/hooks/useProviders"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/contexts/favorites-context"
import { apiService } from "@/services/api.service"
import type { Game } from "helper"
import { cn, formatChips } from "@/lib/utils"

export default function UserGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { favoriteIds, toggleFavorite } = useFavorites()

  // URL-driven filter state (reactive to URL changes)
  const selectedProvider = searchParams.get('provider')
  const selectedType = searchParams.get('type')

  // Local-only state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [gameTypes, setGameTypes] = useState<string[]>([])

  const updateUrl = useCallback((params: { provider?: string | null; type?: string | null }) => {
    const qs = new URLSearchParams()
    const p = params.provider !== undefined ? params.provider : selectedProvider
    const t = params.type !== undefined ? params.type : selectedType
    if (p) qs.set('provider', p)
    if (t) qs.set('type', t)
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
  }, [selectedProvider, selectedType, pathname, router])

  const setSelectedProvider = useCallback((p: string | null) => updateUrl({ provider: p }), [updateUrl])
  const setSelectedType = useCallback((t: string | null) => updateUrl({ type: t }), [updateUrl])

  // Bet state
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [betAmount, setBetAmount] = useState("")
  const [placing, setPlacing] = useState(false)

  const { providers } = useProviders()
  const isOtros = selectedType === '__otros__'
  const { games, loading, loadingMore, hasMore, loadMore } = useGames({
    activeOnly: true,
    providerName: selectedProvider,
    search: debouncedSearch,
    gameType: isOtros ? null : selectedType,
    excludeGameTypes: isOtros ? 'videoSlots,LiveGames,Roulette' : null,
  })
  const { bets, placeBet, loadBets } = useBets()
  const { balance, loadBalance } = useChips()

  // Infinity scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) loadMore()
    }, { rootMargin: "200px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Load game types once
  useEffect(() => {
    apiService.get<{ types: string[] }>("/games/types").then(res => {
      if (res.success && res.data) setGameTypes(res.data.types)
    })
  }, [])

  useEffect(() => {
    if (user) {
      loadBalance()
      loadBets({ limit: 5 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return null

  const handlePlaceBet = async () => {
    if (!selectedGame || !betAmount) return
    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount < selectedGame.minBet || amount > selectedGame.maxBet) {
      toast({ title: "Cantidad inválida", description: `Apostar entre $${selectedGame.minBet} y $${selectedGame.maxBet}`, variant: "destructive" })
      return
    }
    if (balance && amount > balance.chipBalance) {
      toast({ title: "Balance insuficiente", description: `Saldo: $${balance.chipBalance}`, variant: "destructive" })
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
            ? `${bet.multiplier?.toFixed(2)}x · Ganancia: $${bet.payout != null ? formatChips(bet.payout) : '0,00'}`
            : `Perdiste $${formatChips(bet.amount)}`,
          variant: isWin ? "default" : "destructive",
        })
        setBetAmount("")
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo apostar", variant: "destructive" })
      }
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo apostar", variant: "destructive" })
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

  const activeProviders = providers.filter(p => p.isActive)
  const typeLabels: Record<string, string> = {
    slot: "Slots", table: "Mesa", live: "Live", crash: "Crash",
    scratch: "Scratch", virtual: "Virtual", bingo: "Bingo", poker: "Poker",
  }

  return (
    <DashboardLayout title="Casino">
      <div className="space-y-2">

        {/* Search + filters */}
        <div className="space-y-1.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar juegos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Provider pills — horizontal scroll */}
          {activeProviders.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
              <button
                onClick={() => setSelectedProvider(null)}
                className={cn("shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer",
                  selectedProvider === null ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-primary/20"
                )}
              >
                Todos
              </button>
              {activeProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(selectedProvider === p.name ? null : p.name)}
                  className={cn("shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer",
                    selectedProvider === p.name ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-primary/20"
                  )}
                >
                  {p.displayName ?? p.name}
                </button>
              ))}
            </div>
          )}

          {/* Game type tabs — horizontal scroll */}
          {gameTypes.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
              <button
                onClick={() => setSelectedType(null)}
                className={cn("shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer",
                  selectedType === null ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos
              </button>
              {gameTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(selectedType === t ? null : t)}
                  className={cn("shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer",
                    selectedType === t ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {typeLabels[t] ?? t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content: games + optional bet panel */}
        <div className={cn("gap-5", selectedGame ? "grid grid-cols-1 lg:grid-cols-3" : "block")}>

          {/* Bet panel — only when internal game selected */}
          {selectedGame && (
            <div className="lg:col-start-3 lg:row-start-1 space-y-4 order-first lg:order-last">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Apostar en {selectedGame.name}</CardTitle>
                    <button onClick={() => { setSelectedGame(null); setBetAmount("") }} className="p-1 rounded-md hover:bg-muted transition-colors">
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
                      onChange={e => setBetAmount(e.target.value)}
                      disabled={placing}
                      className="mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Límites: ${selectedGame.minBet} – ${selectedGame.maxBet}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[selectedGame.minBet, selectedGame.minBet * 2, selectedGame.minBet * 5, selectedGame.maxBet].map(amt => (
                      <Button key={amt} variant="outline" size="sm" className="text-xs px-0" onClick={() => setBetAmount(String(amt))} disabled={placing}>
                        ${amt}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={handlePlaceBet} disabled={!betAmount || placing || !balance} className="w-full font-semibold">
                    {placing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Apostando...</> : `Apostar $${betAmount || "0.00"}`}
                  </Button>
                </CardContent>
              </Card>

              {bets.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Apuestas recientes</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {bets.slice(0, 5).map(bet => {
                      const game = games.find(g => g.id === bet.gameId)
                      return (
                        <div key={bet.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="min-w-0 mr-2">
                            <p className="text-xs font-medium truncate">{game?.name ?? "Juego"}</p>
                            <p className="text-[10px] text-muted-foreground">${formatChips(bet.amount)} · {new Date(bet.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <Badge variant={getStatusBadge(bet.status)} className="text-[10px] shrink-0">{getStatusLabel(bet)}</Badge>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Games grid */}
          <div className={selectedGame ? "lg:col-span-2 lg:col-start-1 lg:row-start-1" : ""}>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron juegos</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Probá con otro filtro o búsqueda</p>
              </div>
            ) : (
              <div className={cn(
                "grid gap-2",
                selectedGame
                  ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
              )}>
                {games.map(game => {
                  const isProviderGame = !!game.providerGameId
                  const isSelected = selectedGame?.id === game.id
                  const isFavorite = favoriteIds.has(game.id)

                  return (
                    <div
                      key={game.id}
                      onClick={() => {
                        if (isProviderGame) router.push(`/user/games/${game.id}/play`)
                        else setSelectedGame(isSelected ? null : game)
                      }}
                      className={cn(
                        "group rounded-lg border overflow-hidden transition-all bg-card cursor-pointer",
                        isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                      )}
                    >
                      {/* Thumbnail — contain so full image visible */}
                      <div className="relative aspect-3/4 bg-black overflow-hidden">
                        {game.defaultLogo ? (
                          <img
                            src={game.defaultLogo}
                            alt={game.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted">
                            <Gamepad2 className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Heart */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleFavorite(game.id) }}
                          className="btn-icon absolute top-1.5 right-1.5 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                          style={{ width: '24px', height: '24px' }}
                          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                        >
                          <Heart className={cn("h-3 w-3 transition-colors", isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
                        </button>
                        <div className="absolute inset-x-0 bottom-2 hidden md:flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-lg pointer-events-none">
                            <Play className="h-2.5 w-2.5 fill-current" />
                            {isSelected ? "Apostando" : "Jugar"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Infinity scroll sentinel */}
            <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
