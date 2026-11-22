"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  currentWeekRange,
  endOfDayIso,
  periodQuery,
  startOfDayIso,
  useCashierPeriodAccounts
} from "@/hooks/useCashierPeriodAccounts"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { AlertTriangle, Download, FileText, Loader2, RefreshCw } from "lucide-react"
import type { CashierPeriodAccount, CashierSettlement } from "helper"

const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`
const chips = (value: number | null | undefined) => formatChips(Number(value) || 0)

const SETTLEMENT_STATUS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Cobrada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  PARTIALLY_PAID: { label: "Cobro parcial", className: "border-blue-200 bg-blue-50 text-blue-700" },
  PENDING: { label: "Sin cobrar", className: "border-red-200 bg-red-50 text-red-700" }
}

const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

interface RowEdits {
  collected?: string
  chipsLeft?: string
}

const parseAmount = (value: string | undefined, fallback: number) => {
  if (value === undefined) return fallback
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : NaN
}

const hasActivity = ({ preview }: CashierPeriodAccount) =>
  preview.totalSales !== 0 ||
  preview.totalPrizes !== 0 ||
  preview.chipsDelivered !== 0 ||
  preview.previousDebt !== 0 ||
  preview.unsoldChips !== 0

export function CashierPeriodAccounts({ onChanged }: { onChanged?: () => void }) {
  const { toast } = useToast()
  const initial = useMemo(() => currentWeekRange(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const { accounts, loading, error, reload } = useCashierPeriodAccounts(from, to)
  const [edits, setEdits] = useState<Record<string, RowEdits>>({})
  const [liquidatingId, setLiquidatingId] = useState<string | null>(null)
  const [liquidatingAll, setLiquidatingAll] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    setEdits({})
  }, [from, to])

  const rowValues = (account: CashierPeriodAccount) => {
    const { preview, settlement } = account
    if (settlement) {
      return {
        collected: settlement.collected ?? 0,
        chipsLeft: settlement.chipsLeft ?? 0,
        debtCarried: settlement.debtCarried ?? 0
      }
    }
    const rowEdits = edits[preview.cashierId] ?? {}
    const collected = parseAmount(rowEdits.collected, Math.max(preview.totalDue, 0))
    const chipsLeft = parseAmount(rowEdits.chipsLeft, preview.unsoldChips)
    return {
      collected,
      chipsLeft,
      debtCarried: round(preview.totalDue - (Number.isFinite(collected) ? collected : 0))
    }
  }

  const rowError = (account: CashierPeriodAccount): string | null => {
    if (account.settlement) return null
    const { collected, chipsLeft } = rowValues(account)
    if (!account.preview.compensation) return "El cajero no tiene comisión configurada"
    if (!Number.isFinite(collected) || collected < 0) return "Cobro inválido"
    if (!Number.isFinite(chipsLeft) || chipsLeft < 0) return "Deje inválido"
    if (chipsLeft > account.preview.unsoldChips) {
      return `El deje no puede superar las ${chips(account.preview.unsoldChips)} fichas no vendidas`
    }
    return null
  }

  const setField = (cashierId: string, field: keyof RowEdits, value: string) => {
    setEdits(prev => ({ ...prev, [cashierId]: { ...prev[cashierId], [field]: value } }))
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const liquidate = async (account: CashierPeriodAccount): Promise<CashierSettlement | null> => {
    const { collected, chipsLeft } = rowValues(account)
    const response = await apiService.post<{ settlement: CashierSettlement }>(
      `/cashier-accounts/${account.preview.cashierId}/settlements`,
      {
        periodStart: startOfDayIso(from),
        periodEnd: endOfDayIso(to),
        collected,
        chipsLeft
      }
    )
    if (response.success && response.data) return response.data.settlement
    toast({
      variant: "destructive",
      title: `No se pudo liquidar a ${account.preview.cashierUsername}`,
      description: response.error?.message || "Error desconocido"
    })
    return null
  }

  const liquidateOne = async (account: CashierPeriodAccount) => {
    const problem = rowError(account)
    if (problem) {
      toast({ variant: "destructive", title: "Revisá la fila", description: problem })
      return
    }
    const { collected, chipsLeft } = rowValues(account)
    const { preview } = account
    const recoveredUnsold = round(preview.unsoldChips - chipsLeft)
    const message = [
      `Liquidar a ${preview.cashierUsername} del ${shortDate(startOfDayIso(from))} al ${shortDate(endOfDayIso(to))}:`,
      `• Cobro: ${money(collected)} (queda debiendo ${money(round(preview.totalDue - collected))})`,
      `• Se le retiran ${chips(preview.prizeChipsToRecover)} fichas de premios`,
      recoveredUnsold > 0
        ? `• Se le retiran ${chips(recoveredUnsold)} fichas no vendidas y se le dejan ${chips(chipsLeft)}`
        : `• Se le dejan ${chips(chipsLeft)} fichas no vendidas`
    ].join("\n")
    if (!window.confirm(message)) return

    setLiquidatingId(preview.cashierId)
    try {
      const settlement = await liquidate(account)
      if (settlement) {
        toast({ title: `${preview.cashierUsername} liquidado` })
        await reload()
        onChanged?.()
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo liquidar",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setLiquidatingId(null)
    }
  }

  const pendingToLiquidate = accounts.filter(
    account => !account.settlement && hasActivity(account) && account.preview.compensation
  )

  const liquidateAll = async () => {
    const invalid = pendingToLiquidate.find(account => rowError(account))
    if (invalid) {
      toast({
        variant: "destructive",
        title: `Revisá la fila de ${invalid.preview.cashierUsername}`,
        description: rowError(invalid) ?? undefined
      })
      return
    }
    if (
      !window.confirm(
        `¿Liquidar ${pendingToLiquidate.length} cajero(s) del ${shortDate(startOfDayIso(from))} al ${shortDate(endOfDayIso(to))} con los cobros y dejes de la tabla?`
      )
    ) {
      return
    }

    setLiquidatingAll(true)
    let ok = 0
    try {
      for (const account of pendingToLiquidate) {
        if (await liquidate(account)) ok += 1
      }
      if (ok > 0) toast({ title: `${ok} cajero(s) liquidado(s)` })
      await reload()
      onChanged?.()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo completar la liquidación",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setLiquidatingAll(false)
    }
  }

  const downloadSummary = async () => {
    try {
      const blob = await apiService.getBlob(
        `/cashier-accounts/period/summary.pdf?${periodQuery(from, to)}`
      )
      downloadBlob(blob, `cuenta-corriente-${from}-a-${to}.pdf`)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el resumen",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    }
  }

  const downloadReceipt = async (account: CashierPeriodAccount) => {
    if (!account.settlement) return
    setDownloadingId(account.settlement.id)
    try {
      const blob = await apiService.getBlob(
        `/cashier-accounts/settlements/${account.settlement.id}/receipt`
      )
      downloadBlob(blob, `liquidacion-${account.preview.cashierUsername}-${from}.pdf`)
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

  const totals = accounts.reduce(
    (acc, account) => {
      const { preview } = account
      const values = rowValues(account)
      return {
        chipsDelivered: acc.chipsDelivered + preview.chipsDelivered,
        totalSales: acc.totalSales + preview.totalSales,
        totalPrizes: acc.totalPrizes + preview.totalPrizes,
        commission: acc.commission + preview.commission,
        subtotal: acc.subtotal + preview.subtotal,
        previousDebt: acc.previousDebt + preview.previousDebt,
        totalDue: acc.totalDue + preview.totalDue,
        collected: acc.collected + (Number.isFinite(values.collected) ? values.collected : 0),
        debtCarried: acc.debtCarried + values.debtCarried,
        unsoldChips: acc.unsoldChips + preview.unsoldChips,
        chipsLeft: acc.chipsLeft + (Number.isFinite(values.chipsLeft) ? values.chipsLeft : 0)
      }
    },
    {
      chipsDelivered: 0,
      totalSales: 0,
      totalPrizes: 0,
      commission: 0,
      subtotal: 0,
      previousDebt: 0,
      totalDue: 0,
      collected: 0,
      debtCarried: 0,
      unsoldChips: 0,
      chipsLeft: 0
    }
  )

  const editable = (
    account: CashierPeriodAccount,
    field: keyof RowEdits,
    value: number
  ) => (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={edits[account.preview.cashierId]?.[field] ?? String(value)}
      onChange={event => setField(account.preview.cashierId, field, event.target.value)}
      className="ml-auto h-7 w-24 text-right text-xs"
    />
  )

  const invalidRange = !from || !to || from > to

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Desde</div>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Hasta</div>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const week = currentWeekRange()
              setFrom(week.from)
              setTo(week.to)
            }}
          >
            Esta semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading || invalidRange}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSummary}
            disabled={loading || invalidRange || accounts.length === 0}
          >
            <FileText className="mr-1 h-4 w-4" />
            Resumen PDF
          </Button>
          <Button
            size="sm"
            onClick={liquidateAll}
            disabled={loading || liquidatingAll || pendingToLiquidate.length === 0}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {liquidatingAll && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Liquidar todos ({pendingToLiquidate.length})
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Comisión sobre la venta de fichas · Subtotal = venta − comisión · Total = saldo anterior + subtotal ·
        Arrastre = total − cobro (pasa a la próxima liquidación). Al liquidar se le retiran al cajero las fichas
        de premios; de las no vendidas, lo que no se deje también se retira.
      </p>

      {invalidRange ? (
        <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
          Elegí un rango de fechas válido.
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando cuentas del período...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          No hay cajeros para mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1350px] text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cajero</th>
                <th className="px-2 py-2 text-right font-semibold" title="Fichas que le entregaste en el período">Entregadas</th>
                <th className="px-2 py-2 text-right font-semibold">Venta de fichas</th>
                <th className="px-2 py-2 text-right font-semibold">Premios</th>
                <th className="px-2 py-2 text-right font-semibold">Comisión</th>
                <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
                <th className="px-2 py-2 text-right font-semibold">Saldo ant.</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 text-right font-semibold">Cobro</th>
                <th className="px-2 py-2 text-right font-semibold">Arrastre</th>
                <th className="px-2 py-2 text-right font-semibold" title="Fichas que tiene el cajero, sin contar las de premios">No vendidas</th>
                <th className="px-2 py-2 text-right font-semibold" title="Fichas no vendidas que le quedan al cajero">Deje</th>
                <th className="px-2 py-2 text-center font-semibold">Estado</th>
                <th className="px-2 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map(account => {
                const { preview, settlement } = account
                const values = rowValues(account)
                const problem = rowError(account)
                const status = settlement ? SETTLEMENT_STATUS[settlement.status] : null
                return (
                  <tr key={preview.cashierId} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{preview.cashierUsername}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {preview.compensation
                          ? `${preview.compensation.percentage ?? 0}% comisión`
                          : "sin comisión"}
                        {settlement && (
                          <> · {shortDate(settlement.periodStart)} al {shortDate(settlement.periodEnd)}</>
                        )}
                      </div>
                      {preview.unsettledSince && !settlement && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          sin liquidar desde {shortDate(preview.unsettledSince)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{chips(preview.chipsDelivered)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.totalSales)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.totalPrizes)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.commission)}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{money(preview.subtotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.previousDebt)}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(preview.totalDue)}</td>
                    <td className="px-2 py-2 text-right">
                      {settlement
                        ? <span className="tabular-nums">{money(values.collected)}</span>
                        : editable(account, "collected", Math.max(preview.totalDue, 0))}
                    </td>
                    <td className={`px-2 py-2 text-right font-semibold tabular-nums ${values.debtCarried > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                      {money(values.debtCarried)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{chips(preview.unsoldChips)}</td>
                    <td className="px-2 py-2 text-right">
                      {settlement
                        ? <span className="tabular-nums">{chips(values.chipsLeft)}</span>
                        : editable(account, "chipsLeft", preview.unsoldChips)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {status ? (
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {settlement ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          disabled={downloadingId === settlement.id}
                          onClick={() => downloadReceipt(account)}
                          title="Descargar comprobante"
                        >
                          {downloadingId === settlement.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          disabled={Boolean(problem) || liquidatingId === preview.cashierId || liquidatingAll}
                          title={problem ?? "Liquidar este cajero"}
                          onClick={() => liquidateOne(account)}
                        >
                          {liquidatingId === preview.cashierId && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                          Liquidar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-muted/30 font-semibold">
              <tr>
                <td className="px-3 py-2">Totales</td>
                <td className="px-2 py-2 text-right">{chips(totals.chipsDelivered)}</td>
                <td className="px-2 py-2 text-right">{money(totals.totalSales)}</td>
                <td className="px-2 py-2 text-right">{money(totals.totalPrizes)}</td>
                <td className="px-2 py-2 text-right">{money(totals.commission)}</td>
                <td className="px-2 py-2 text-right">{money(totals.subtotal)}</td>
                <td className="px-2 py-2 text-right">{money(totals.previousDebt)}</td>
                <td className="px-2 py-2 text-right">{money(totals.totalDue)}</td>
                <td className="px-2 py-2 text-right">{money(totals.collected)}</td>
                <td className="px-2 py-2 text-right">{money(totals.debtCarried)}</td>
                <td className="px-2 py-2 text-right">{chips(totals.unsoldChips)}</td>
                <td className="px-2 py-2 text-right">{chips(totals.chipsLeft)}</td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
