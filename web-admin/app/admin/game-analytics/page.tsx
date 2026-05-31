"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"

interface GameAnalyticRow {
  gameId: string
  gameName: string
  providerName: string | null
  gameType: string | null
  isActive: boolean
  launchCount: number
  transactionCount: number
  totalWagered: number
  errorRatePct: number
}

type DateRange = 7 | 30 | 90

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
  { label: "90 días", value: 90 },
]

function fmt(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value)
}

function ErrorBadge({ pct, hasData }: { pct: number; hasData: boolean }) {
  if (!hasData) return <Badge variant="outline" className="text-xs">Sin datos</Badge>
  if (pct >= 70) return <Badge className="bg-red-500 text-white text-xs">{pct.toFixed(1)}%</Badge>
  if (pct >= 30) return <Badge className="bg-yellow-500 text-black text-xs">{pct.toFixed(1)}%</Badge>
  return <Badge className="bg-green-600 text-white text-xs">{pct.toFixed(1)}%</Badge>
}

export default function GameAnalyticsPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<GameAnalyticRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(30)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && role !== UserRole.OWNER && role !== UserRole.ADMIN) {
      router.push("/admin/dashboard")
    }
  }, [role, isLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const dateTo = new Date()
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - dateRange)
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      })
      const res = await apiService.get<GameAnalyticRow[]>(`/admin/game-analytics?${params}`)
      if (res.success && res.data) {
        setRows([...res.data].sort((a, b) => b.errorRatePct - a.errorRatePct))
      }
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  const handleDeactivate = async (gameId: string) => {
    setDeactivatingId(gameId)
    try {
      const res = await apiService.patch(`/games/${gameId}`, { isActive: false })
      if (res.success) {
        setRows(prev => prev.map(r => r.gameId === gameId ? { ...r, isActive: false } : r))
      }
    } finally {
      setDeactivatingId(null)
    }
  }

  if (isLoading || (role !== UserRole.OWNER && role !== UserRole.ADMIN)) return null

  return (
    <DashboardLayout title="Analíticas de Juegos">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analíticas de Juegos</h1>
            <p className="text-muted-foreground text-sm">
              Lanzamientos, transacciones y tasa de error por juego
            </p>
          </div>
          <div className="flex gap-2">
            {DATE_RANGE_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={dateRange === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados — últimos {dateRange} días</CardTitle>
            <CardDescription>
              Ordenado por tasa de error descendente. Rojo ≥70% · Amarillo 30–69% · Verde &lt;30%
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground text-sm">
                No hay lanzamientos registrados en este período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">Juego</th>
                      <th className="p-3 font-medium">Provider</th>
                      <th className="p-3 font-medium">Tipo</th>
                      <th className="p-3 font-medium text-right">Lanzamientos</th>
                      <th className="p-3 font-medium text-right">Transacciones</th>
                      <th className="p-3 font-medium text-center">Error %</th>
                      <th className="p-3 font-medium text-right">Apostado</th>
                      <th className="p-3 font-medium text-center">Estado</th>
                      <th className="p-3 font-medium text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.gameId} className="border-b hover:bg-muted/40 transition-colors">
                        <td className="p-3 font-medium max-w-[160px] truncate">{row.gameName}</td>
                        <td className="p-3 text-muted-foreground text-xs">{row.providerName ?? "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs">{row.gameType ?? "—"}</td>
                        <td className="p-3 text-right tabular-nums">{fmt(row.launchCount)}</td>
                        <td className="p-3 text-right tabular-nums">{fmt(row.transactionCount)}</td>
                        <td className="p-3 text-center">
                          <ErrorBadge pct={row.errorRatePct} hasData={row.launchCount > 0} />
                        </td>
                        <td className="p-3 text-right tabular-nums">${fmt(row.totalWagered)}</td>
                        <td className="p-3 text-center">
                          <Badge variant={row.isActive ? "default" : "secondary"} className="text-xs">
                            {row.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {row.isActive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deactivatingId === row.gameId}
                              onClick={() => handleDeactivate(row.gameId)}
                            >
                              {deactivatingId === row.gameId ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Procesando...
                                </>
                              ) : "Desactivar"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
