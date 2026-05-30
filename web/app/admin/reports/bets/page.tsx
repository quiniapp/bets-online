"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import type { Bet } from "helper"
import { BetStatus } from "helper"
import { formatChips } from "@/lib/utils"
import { apiService } from "@/services/api.service"

interface BetStats {
  totalBets: number
  wonBets: number
  lostBets: number
  pendingBets: number
  totalWagered: number
  totalWon: number
  winRate: number
}

const PAGE_SIZE = 20

export default function BetsReportPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [stats, setStats] = useState<BetStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterOutcome, setFilterOutcome] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [histRes, statsRes] = await Promise.all([
          apiService.get<{ bets: Bet[]; total: number; limit: number; offset: number }>(
            `/bets/my-history?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${filterOutcome !== 'all' ? `&status=${filterOutcome}` : ''}`
          ),
          page === 0 ? apiService.get<BetStats>('/bets/my-statistics') : Promise.resolve(null),
        ])
        if (histRes.success && histRes.data) {
          setBets(histRes.data.bets)
          setTotal(histRes.data.total)
        }
        if (statsRes && statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [page, filterOutcome])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getBadgeVariant = (status: string) => {
    if (status === BetStatus.WON) return "default"
    if (status === BetStatus.LOST) return "destructive"
    return "secondary"
  }

  const houseEdge = stats && stats.totalWagered > 0
    ? ((stats.totalWagered - stats.totalWon) / stats.totalWagered * 100)
    : 0

  return (
    <DashboardLayout title="Reporte de Apuestas">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBets ?? '—'}</div>
              <p className="text-xs text-muted-foreground">apuestas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-green-500" />Ganadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.wonBets ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                {stats ? `${stats.winRate.toFixed(1)}% win rate` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-red-500" />Perdidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.lostBets ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                {stats && stats.totalBets > 0 ? `${((stats.lostBets / stats.totalBets) * 100).toFixed(1)}% del total` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-yellow-500" />Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.pendingBets ?? '—'}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monto Total Apostado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatChips(stats?.totalWagered ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado en Ganancias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${formatChips(stats?.totalWon ?? 0)}</div>
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

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={filterOutcome} onValueChange={v => { setFilterOutcome(v); setPage(0) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              <SelectItem value={BetStatus.WON}>Ganadas</SelectItem>
              <SelectItem value={BetStatus.LOST}>Perdidas</SelectItem>
              <SelectItem value={BetStatus.PENDING}>Pendientes</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} apuestas</span>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Apuestas</CardTitle>
            <CardDescription>Apuestas del usuario actual</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : bets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay apuestas registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Juego</th>
                      <th className="text-left px-4 py-3 font-medium">Monto</th>
                      <th className="text-left px-4 py-3 font-medium">Resultado</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Ganancia</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map(bet => {
                      const winAmount = bet.status === BetStatus.WON ? bet.amount * (bet.multiplier || 1) : 0
                      return (
                        <tr key={bet.id} className="border-b hover:bg-muted/40">
                          <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{bet.gameId}</td>
                          <td className="px-4 py-3">${formatChips(bet.amount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getBadgeVariant(bet.status)}>{bet.status}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {bet.status === BetStatus.WON
                              ? <span className="text-green-600">${formatChips(winAmount)}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {new Date(bet.createdAt).toLocaleDateString('es-AR')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
