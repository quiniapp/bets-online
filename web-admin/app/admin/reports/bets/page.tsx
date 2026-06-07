"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dice5, Coins, Gift, TrendingUp, Loader2 } from "lucide-react"
import type { Game } from "helper"
import { formatChips } from "@/lib/utils"
import { apiService } from "@/services/api.service"

interface ReportTotals {
  rounds: number
  wagered: number
  prizes: number
  balance: number
}

interface ReportRow {
  source: "native" | "provider"
  id: string
  userId: string
  username: string
  gameName: string
  providerName: string | null
  wagered: number
  prize: number
  status: string | null
  createdAt: string
}

const PAGE_SIZE = 30
const ALL = "__all__"

const toDateInput = (d: Date) => d.toISOString().slice(0, 10)

export default function BetsReportPage() {
  // Filters
  const [dateFrom, setDateFrom] = useState(toDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
  const [dateTo, setDateTo] = useState(toDateInput(new Date()))
  const [providerName, setProviderName] = useState<string>(ALL)
  const [gameId, setGameId] = useState<string>(ALL)
  const [usernameInput, setUsernameInput] = useState("")
  const [appliedUsername, setAppliedUsername] = useState("")

  // Filter option sources
  const [providers, setProviders] = useState<string[]>([])
  const [games, setGames] = useState<Pick<Game, "id" | "name">[]>([])

  // Data
  const [totals, setTotals] = useState<ReportTotals | null>(null)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Load provider options once
  useEffect(() => {
    apiService.get<{ providers: string[] }>("/games/providers").then(res => {
      if (res.success && res.data) setProviders(res.data.providers)
    })
  }, [])

  // Load games for the selected provider (game filter is scoped to a provider)
  useEffect(() => {
    if (providerName === ALL) {
      setGames([])
      setGameId(ALL)
      return
    }
    setGameId(ALL)
    apiService
      .get<Game[]>(`/games?status=all&limit=100&page=1&providerName=${encodeURIComponent(providerName)}`)
      .then(res => {
        if (res.success && res.data) setGames(res.data.map(g => ({ id: g.id, name: g.name })))
      })
  }, [providerName])

  // Debounce the username text input into appliedUsername
  useEffect(() => {
    const t = setTimeout(() => setAppliedUsername(usernameInput.trim()), 400)
    return () => clearTimeout(t)
  }, [usernameInput])

  const buildQuery = useCallback(
    (pageNum: number) => {
      const p = new URLSearchParams()
      p.set("page", String(pageNum))
      p.set("limit", String(PAGE_SIZE))
      if (dateFrom) p.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString())
      if (dateTo) p.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString())
      if (providerName !== ALL) p.set("providerName", providerName)
      if (gameId !== ALL) p.set("gameId", gameId)
      if (appliedUsername) p.set("username", appliedUsername)
      return p.toString()
    },
    [dateFrom, dateTo, providerName, gameId, appliedUsername]
  )

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiService.get<{ totals: ReportTotals; rows: ReportRow[] }>(
          `/admin/reports/bets?${buildQuery(pageNum)}`
        )
        if (res.success && res.data) {
          setTotals(res.data.totals)
          setRows(prev => (append ? [...prev, ...res.data!.rows] : res.data!.rows))
          const tp = res.meta?.totalPages || 1
          setTotal(res.meta?.total ?? 0)
          setHasMore(pageNum < tp)
        } else {
          setError(res.error?.message || "No se pudo cargar el reporte")
        }
      } catch {
        setError("No se pudo cargar el reporte")
      } finally {
        setLoading(false)
      }
    },
    [buildQuery]
  )

  // Reset + reload page 1 whenever a filter changes
  useEffect(() => {
    setPage(1)
    setRows([])
    setHasMore(true)
    load(1, false)
  }, [load])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1
          setPage(next)
          load(next, true)
        }
      },
      { rootMargin: "200px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, page, load])

  return (
    <DashboardLayout title="Reporte de Apuestas">
      <div className="space-y-6">
        {/* Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Dice5 className="h-4 w-4" />Rondas jugadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals ? totals.rounds.toLocaleString("es-AR") : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Coins className="h-4 w-4" />Apostado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatChips(totals?.wagered ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-green-500" />Premios pagados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${formatChips(totals?.prizes ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-500" />Balance de la casa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(totals?.balance ?? 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                ${formatChips(totals?.balance ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} max={dateTo} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor</Label>
              <Select value={providerName} onValueChange={setProviderName}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Juego</Label>
              <Select value={gameId} onValueChange={setGameId} disabled={providerName === ALL}>
                <SelectTrigger><SelectValue placeholder={providerName === ALL ? "Elegí un proveedor" : "Todos"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Usuario / Agente</Label>
              <Input placeholder="username" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Detalle por ronda</CardTitle>
            <span className="text-sm text-muted-foreground">{total.toLocaleString("es-AR")} rondas</span>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Usuario</th>
                      <th className="text-left px-4 py-3 font-medium">Juego</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Proveedor</th>
                      <th className="text-right px-4 py-3 font-medium">Apostado</th>
                      <th className="text-right px-4 py-3 font-medium">Premio</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={`${r.source}-${r.id}`} className="border-b hover:bg-muted/40">
                        <td className="px-4 py-3">{r.username}</td>
                        <td className="px-4 py-3 truncate max-w-[160px]">{r.gameName}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">{r.providerName ?? "—"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">${formatChips(r.wagered)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r.prize > 0
                            ? <span className="text-green-600">${formatChips(r.prize)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {new Date(r.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!loading && rows.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No hay rondas para los filtros seleccionados</div>
                )}

                {/* Infinite-scroll sentinel + loader */}
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
