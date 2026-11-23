"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import ROUTER from "@/routes"
import { ChevronLeft, ChevronRight, Download, HandCoins, Loader2 } from "lucide-react"
import {
  SettlementStatus,
  UserRole,
  settlementAmountDue,
  settlementCollectionAmount
} from "helper"
import type { CashierOwnSettlementsResult, CashierSettlement } from "helper"

const ITEMS_PER_PAGE = 20

const money = (value: number | null | undefined) => {
  const amount = Number(value) || 0
  return `${amount < 0 ? "−" : ""}$${formatChips(Math.abs(amount))}`
}
const chips = (value: number | null | undefined) => formatChips(Number(value) || 0)
const formatDate = (value: Date | string, withTime = false) =>
  withTime
    ? new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

const isLegacy = (settlement: CashierSettlement) =>
  settlement.subtotal === null || settlement.subtotal === undefined

const statusBadge = (settlement: CashierSettlement) => {
  if (settlement.status !== SettlementStatus.CANCELED && (settlement.pendingCollection ?? 0) > 0) {
    return { label: "Pago pendiente de confirmar", className: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  switch (settlement.status) {
    case SettlementStatus.PAID:
      return { label: "Pagada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    case SettlementStatus.PARTIALLY_PAID:
      return { label: "Pago parcial", className: "border-blue-200 bg-blue-50 text-blue-700" }
    case SettlementStatus.CANCELED:
      return { label: "Anulada", className: "border-slate-200 bg-slate-50 text-slate-600" }
    default:
      return { label: "Sin pagar", className: "border-red-200 bg-red-50 text-red-700" }
  }
}

/** Historial de liquidaciones del propio cajero (solo lectura). */
export default function CashierSettlementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { role, isLoading: authLoading } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CashierOwnSettlementsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && role !== UserRole.CASHIER) router.replace(ROUTER.SITE)
  }, [authLoading, role, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) })
      const response = await apiService.get<CashierOwnSettlementsResult>(
        `/cashier-accounts/me/settlements?${query.toString()}`
      )
      if (response.success && response.data) setData(response.data)
      else setError(response.error?.message || "No se pudieron cargar las liquidaciones")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las liquidaciones")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (!authLoading && role === UserRole.CASHIER) load()
  }, [authLoading, role, load])

  const downloadReceipt = async (settlement: CashierSettlement) => {
    setDownloadingId(settlement.id)
    try {
      const blob = await apiService.getBlob(`/cashier-accounts/me/settlements/${settlement.id}/receipt`)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `liquidacion-${formatDate(settlement.periodEnd).replaceAll("/", "-")}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el comprobante",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setDownloadingId(null)
    }
  }

  if (authLoading || role !== UserRole.CASHIER) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const settlements = data?.settlements ?? []
  const onAccount = data?.onAccountCollections ?? []
  const onAccountTotal = onAccount.reduce((acc, collection) => acc + Number(collection.amount), 0)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const latest = page === 1 ? settlements.find(s => s.status !== SettlementStatus.CANCELED) : undefined

  return (
    <DashboardLayout title="Mis liquidaciones">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Mis liquidaciones</h2>
          <p className="text-sm text-muted-foreground">
            Lo que vendiste, tu comisión y lo que le pagaste al owner en cada liquidación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobros a cuenta de esta semana</CardTitle>
              <HandCoins className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{money(onAccountTotal)}</div>
              <p className="text-xs text-muted-foreground">
                {onAccount.length === 0
                  ? "Sin pagos registrados desde la última liquidación"
                  : `${onAccount.length} pago(s); se descuentan en tu próxima liquidación`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Última liquidación</CardTitle>
            </CardHeader>
            <CardContent>
              {latest && !isLegacy(latest) ? (
                <>
                  <div className={`text-2xl font-bold ${(latest.debtCarried ?? 0) > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                    {money(latest.debtCarried)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    debés al {formatDate(latest.periodEnd)}
                    {(latest.pendingCollection ?? 0) > 0 &&
                      ` · ${money(latest.pendingCollection)} esperando que el owner confirme tu pago`}
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Todavía no tenés liquidaciones.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {onAccount.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pagos a cuenta sin liquidar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {onAccount.map(collection => (
                <div key={collection.id} className="flex items-center justify-between border-t px-6 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(collection.createdAt, true)}
                    {collection.paymentReference ? ` · ${collection.paymentReference}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">{money(collection.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando liquidaciones...
              </div>
            ) : error ? (
              <div className="py-16 text-center text-sm text-red-600">{error}</div>
            ) : settlements.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Todavía no tenés liquidaciones.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Período</th>
                      <th className="px-3 py-3 text-right font-semibold">Venta</th>
                      <th className="px-3 py-3 text-right font-semibold">Comisión</th>
                      <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
                      <th className="px-3 py-3 text-right font-semibold">Saldo ant.</th>
                      <th className="px-3 py-3 text-right font-semibold">A cuenta</th>
                      <th className="px-3 py-3 text-right font-semibold">A pagar</th>
                      <th className="px-3 py-3 text-right font-semibold">Pagado</th>
                      <th className="px-3 py-3 text-right font-semibold">Debés</th>
                      <th className="px-3 py-3 text-right font-semibold" title="Fichas no vendidas que te quedaron">Fichas</th>
                      <th className="px-3 py-3 text-center font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {settlements.map(settlement => {
                      const legacy = isLegacy(settlement)
                      const badge = statusBadge(settlement)
                      const canceled = settlement.status === SettlementStatus.CANCELED
                      const dash = (render: () => string) => (legacy ? "—" : render())
                      return (
                        <tr key={settlement.id} className={canceled ? "text-muted-foreground line-through decoration-slate-300" : "hover:bg-muted/20"}>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(settlement.totalSales)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {money(settlement.commission ?? settlement.payableAmount)}
                            {settlement.percentage !== null && settlement.percentage !== undefined && (
                              <div className="text-[10px] text-muted-foreground">{settlement.percentage}%</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{dash(() => money(settlement.subtotal))}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{dash(() => money(settlement.previousDebt))}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {dash(() => (settlement.onAccountCollected ? `− ${money(settlement.onAccountCollected)}` : "—"))}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">
                            {dash(() => money(settlementAmountDue(settlement)))}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {dash(() => money((settlement.collected ?? 0) - (settlement.onAccountCollected ?? 0)))}
                            {!legacy && (settlement.pendingCollection ?? 0) > 0 && !canceled && (
                              <div className="text-[10px] text-amber-700">
                                de {money(settlementCollectionAmount(settlement))} acordado
                              </div>
                            )}
                          </td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums ${(settlement.debtCarried ?? 0) > 0 && !canceled ? "text-amber-700" : ""}`}>
                            {dash(() => money(settlement.debtCarried))}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {settlement.chipsLeft === null ? "—" : chips(settlement.chipsLeft)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!canceled && (
                              <Button
                                variant="outline"
                                size="sm"
                                title="Descargar comprobante PDF"
                                disabled={downloadingId === settlement.id}
                                onClick={() => downloadReceipt(settlement)}
                              >
                                {downloadingId === settlement.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Download className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{data ? `${data.total} liquidación(es)` : ""}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
