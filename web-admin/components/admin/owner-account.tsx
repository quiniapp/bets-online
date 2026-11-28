"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { currentWeekRange, periodQuery, toDateInput, useOwnerAccount } from "@/hooks/useCashierPeriodAccounts"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { FileText, Loader2, RefreshCw } from "lucide-react"
import type { OwnerAccountMovement } from "helper"

const money = (value: number | null | undefined) => {
  const amount = Number(value) || 0
  return `${amount < 0 ? "−" : ""}$${formatChips(Math.abs(amount))}`
}
const chips = (value: number | null | undefined) => formatChips(Number(value) || 0)

const MOVEMENT_LABELS: Record<OwnerAccountMovement["kind"], { label: string; className: string }> = {
  SETTLEMENT: { label: "Liquidación", className: "bg-blue-100 text-blue-800" },
  COLLECTION: { label: "Cobro", className: "bg-emerald-100 text-emerald-800" },
  PRIZES: { label: "Premios", className: "bg-red-100 text-red-800" }
}

const monthRange = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: toDateInput(start), to: toDateInput(today) }
}

function Stat({
  title,
  value,
  hint,
  tone
}: {
  title: string
  value: string
  hint?: string
  tone?: "positive" | "negative" | "warning"
}) {
  const color =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : tone === "warning"
          ? "text-amber-600"
          : ""
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function OwnerAccount() {
  const initial = useMemo(() => currentWeekRange(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const { data, loading, error, reload } = useOwnerAccount(from, to)
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)

  const downloadSummary = async () => {
    setDownloading(true)
    try {
      const blob = await apiService.getBlob(`/cashier-accounts/owner/summary.pdf?${periodQuery(from, to)}`)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `cuenta-del-owner-${from}-al-${to}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el resumen",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setDownloading(false)
    }
  }

  const setRange = (range: { from: string; to: string }) => {
    setFrom(range.from)
    setTo(range.to)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Desde</div>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Hasta</div>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setRange(currentWeekRange())}>Esta semana</Button>
        <Button variant="ghost" size="sm" onClick={() => setRange(monthRange())}>Este mes</Button>
        <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Actualizar
        </Button>
        <Button
          size="sm"
          className="ml-auto"
          onClick={downloadSummary}
          disabled={downloading || loading || !data}
          title="Descargar el resumen de la cuenta del owner para el rango elegido"
        >
          {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />}
          Resumen PDF
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading || !data ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
        </div>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Liquidaciones del período ({data.settled.settlements})
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                title="Ganancia"
                value={money(data.settled.profit)}
                hint={`ingreso neto ${money(data.settled.subtotal)} − premios ${money(data.settled.prizes)}`}
                tone={data.settled.profit >= 0 ? "positive" : "negative"}
              />
              <Stat
                title="Ingreso neto (subtotal)"
                value={money(data.settled.subtotal)}
                hint={`venta ${money(data.settled.totalSales)} − comisiones ${money(data.settled.commission)}`}
              />
              <Stat
                title="Premios pagados"
                value={money(data.settled.prizes)}
                hint="pagados por vos a los jugadores"
                tone="negative"
              />
              <Stat
                title="Caja neta"
                value={money(data.settled.cashFlow)}
                hint={`cobrado ${money(data.settled.collected)} − premios ${money(data.settled.prizes)}`}
                tone={data.settled.cashFlow >= 0 ? "positive" : "negative"}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Fichas entregadas {chips(data.settled.chipsDelivered)} · fichas recuperadas{" "}
              {chips(data.settled.chipsRecovered)} · cobros registrados en el rango{" "}
              {money(data.collectedInRange)} (incluye cobros de liquidaciones anteriores)
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Situación actual</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                title="Deuda de cajeros"
                value={money(data.current.cashierDebt)}
                hint="arrastre de las últimas liquidaciones"
                tone="warning"
              />
              <Stat
                title="Sin liquidar"
                value={money(data.current.openSubtotal)}
                hint={`venta ${money(data.current.openSales)} · premios ${money(data.current.openPrizes)}`}
              />
              <Stat title="Fichas en cajeros" value={chips(data.current.cashierChips)} />
              <Stat title="Fichas en jugadores" value={chips(data.current.playerChips)} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Movimientos</h3>
            <div className="overflow-x-auto rounded-lg border bg-card">
              {data.movements.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No hay liquidaciones ni cobros en el período.
                </div>
              ) : (
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                      <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                      <th className="px-3 py-2 text-left font-semibold">Cajero</th>
                      <th className="px-3 py-2 text-left font-semibold">Detalle</th>
                      <th className="px-3 py-2 text-right font-semibold">Caja</th>
                      <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.movements.map(movement => {
                      const label = MOVEMENT_LABELS[movement.kind]
                      return (
                        <tr key={movement.id} className="hover:bg-muted/20">
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={`${label.className} text-xs`}>{label.label}</Badge>
                          </td>
                          <td className="px-3 py-2 font-medium">{movement.cashierUsername}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{movement.description}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${movement.cash > 0 ? "text-emerald-600" : movement.cash < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {movement.cash === 0 ? "—" : money(movement.cash)}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums ${movement.profit > 0 ? "text-emerald-600" : movement.profit < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {movement.profit === 0 ? "—" : money(movement.profit)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
