"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CashierSettlementDialog,
  defaultSettlementValues,
  type SettlementValues
} from "@/components/admin/cashier-settlement-dialog"
import {
  CashierCollectionDialog,
  type CollectionTarget
} from "@/components/admin/cashier-collection-dialog"
import {
  ConfirmCollectionDialog,
  type ConfirmCollectionTarget
} from "@/components/admin/confirm-collection-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  cutoffQuery,
  endOfDayIso,
  todayInput,
  useCashierPeriodAccounts
} from "@/hooks/useCashierPeriodAccounts"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { CheckCircle2, Download, Eye, FileText, HandCoins, Loader2, Percent, RefreshCw } from "lucide-react"
import { settlementCollectionAmount } from "helper"
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

/** Lo mínimo que necesitan los diálogos de comisión y de cuenta del cajero. */
export interface CashierRowTarget {
  cashierId: string
  username: string
  percentage: number | null
}

/** Hay algo para liquidar: ventas, premios, entregas o deuda. Solo fichas no vendidas no cuenta. */
const hasActivity = ({ preview }: CashierPeriodAccount) =>
  preview.totalSales !== 0 ||
  preview.totalPrizes !== 0 ||
  preview.chipsDelivered !== 0 ||
  preview.previousDebt !== 0

interface Props {
  onChanged?: () => void
  onCompensation?: (target: CashierRowTarget) => void
  onDetail?: (target: CashierRowTarget) => void
}

export function CashierPeriodAccounts({ onChanged, onCompensation, onDetail }: Props) {
  const { toast } = useToast()
  const [cutoff, setCutoff] = useState(todayInput())
  const { accounts, loading, error, reload } = useCashierPeriodAccounts(cutoff)
  const [dialogAccounts, setDialogAccounts] = useState<CashierPeriodAccount[] | null>(null)
  const [liquidatingId, setLiquidatingId] = useState<string | null>(null)
  const [liquidatingAll, setLiquidatingAll] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [collectionTarget, setCollectionTarget] = useState<CollectionTarget | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmCollectionTarget | null>(null)

  useEffect(() => {
    setDialogAccounts(null)
  }, [cutoff])

  const targetOf = ({ preview }: CashierPeriodAccount): CashierRowTarget => ({
    cashierId: preview.cashierId,
    username: preview.cashierUsername ?? "",
    percentage: preview.compensation?.percentage ?? null
  })

  /** Liquidado: lo que se fijó al liquidar. Sin liquidar: los valores sugeridos. */
  const rowValues = (account: CashierPeriodAccount) => {
    const { preview, settlement } = account
    if (settlement) {
      return {
        onAccountCollected: settlement.onAccountCollected ?? 0,
        collected: settlementCollectionAmount(settlement),
        pendingCollection: settlement.pendingCollection ?? 0,
        chipsLeft: settlement.chipsLeft ?? 0
      }
    }
    const { collected, chipsLeft } = defaultSettlementValues(account)
    return { onAccountCollected: preview.onAccountCollected, collected, pendingCollection: 0, chipsLeft }
  }

  const refreshAfterCollection = async () => {
    await reload()
    onChanged?.()
  }

  const rowError = (account: CashierPeriodAccount): string | null => {
    if (account.settlement) return null
    if (!account.preview.compensation) return "El cajero no tiene comisión configurada"
    return null
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

  const liquidate = async (
    account: CashierPeriodAccount,
    { collected, chipsLeft }: SettlementValues
  ): Promise<CashierSettlement | null> => {
    const response = await apiService.post<{ settlement: CashierSettlement }>(
      `/cashier-accounts/${account.preview.cashierId}/settlements`,
      { periodEnd: endOfDayIso(cutoff), collected, chipsLeft }
    )
    if (response.success && response.data) return response.data.settlement
    toast({
      variant: "destructive",
      title: `No se pudo liquidar a ${account.preview.cashierUsername}`,
      description: response.error?.message || "Error desconocido"
    })
    return null
  }

  const pendingToLiquidate = accounts.filter(
    account => !account.settlement && hasActivity(account) && account.preview.compensation
  )

  const openLiquidateOne = (account: CashierPeriodAccount) => {
    const problem = rowError(account)
    if (problem) {
      toast({ variant: "destructive", title: "Revisá la fila", description: problem })
      return
    }
    setDialogAccounts([account])
  }

  const openLiquidateAll = () => {
    if (pendingToLiquidate.length > 0) setDialogAccounts(pendingToLiquidate)
  }

  const confirmLiquidation = async (values: Record<string, SettlementValues>) => {
    if (!dialogAccounts) return
    const bulk = dialogAccounts.length > 1
    if (bulk) setLiquidatingAll(true)
    else setLiquidatingId(dialogAccounts[0].preview.cashierId)
    let ok = 0
    try {
      for (const account of dialogAccounts) {
        if (await liquidate(account, values[account.preview.cashierId])) ok += 1
      }
      if (ok > 0) {
        toast({
          title: bulk ? `${ok} cajero(s) liquidado(s)` : `${dialogAccounts[0].preview.cashierUsername} liquidado`
        })
      }
      setDialogAccounts(null)
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
      setLiquidatingId(null)
    }
  }

  const downloadSummary = async () => {
    try {
      const blob = await apiService.getBlob(`/cashier-accounts/period/summary.pdf?${cutoffQuery(cutoff)}`)
      downloadBlob(blob, `cuenta-corriente-al-${cutoff}.pdf`)
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
      downloadBlob(blob, `liquidacion-${account.preview.cashierUsername}.pdf`)
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
        onAccountCollected: acc.onAccountCollected + values.onAccountCollected,
        collected: acc.collected + values.collected,
        chipBalance: acc.chipBalance + preview.chipBalance,
        chipsLeft: acc.chipsLeft + values.chipsLeft
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
      onAccountCollected: 0,
      collected: 0,
      chipBalance: 0,
      chipsLeft: 0
    }
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Liquidar hasta</div>
            <Input type="date" value={cutoff} max={todayInput()} onChange={e => setCutoff(e.target.value)} className="w-44" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCutoff(todayInput())}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading || !cutoff}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSummary}
            disabled={loading || !cutoff || accounts.length === 0}
          >
            <FileText className="mr-1 h-4 w-4" />
            Resumen PDF
          </Button>
          <Button
            size="sm"
            onClick={openLiquidateAll}
            disabled={loading || liquidatingAll || pendingToLiquidate.length === 0}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {liquidatingAll && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Liquidar todos ({pendingToLiquidate.length})
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Cada cajero se liquida desde su última liquidación (o su primer movimiento) hasta la fecha de corte.
        Comisión sobre la venta de fichas · Subtotal = venta − comisión · Total = saldo anterior + subtotal ·
        A cuenta = cobros de la semana (botón Cobro), se descuentan del total. El cobro de la liquidación queda
        pendiente hasta que confirmes que el cajero pagó. Balance = fichas que tiene el cajero; al liquidar se le
        retiran las de premios y, de las no vendidas, lo que no se le deje.
      </p>

      {!cutoff ? (
        <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
          Elegí una fecha de corte.
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          No hay cajeros para mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1550px] text-xs">
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
                <th className="px-2 py-2 text-right font-semibold" title="Cobros a cuenta de la semana, se descuentan del total">A cuenta</th>
                <th className="px-2 py-2 text-right font-semibold" title="Cobro de la liquidación">Cobro</th>
                <th className="px-2 py-2 text-right font-semibold" title="Fichas que tiene el cajero">Balance</th>
                <th className="px-2 py-2 text-right font-semibold" title="Fichas no vendidas que le quedan al cajero">No vendidas</th>
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
                const target = targetOf(account)
                const awaitingConfirmation = values.pendingCollection > 0
                return (
                  <tr key={preview.cashierId} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <button
                        className="font-medium text-blue-600 hover:underline"
                        onClick={() => onDetail?.(target)}
                        title="Ver cuenta corriente del cajero"
                      >
                        {preview.cashierUsername}
                      </button>
                      <div className="text-[10px] text-muted-foreground">
                        {preview.compensation
                          ? `${preview.compensation.percentage ?? 0}% comisión`
                          : "sin comisión"}
                        {" · "}
                        {settlement
                          ? <>liquidado {shortDate(settlement.periodStart)} al {shortDate(settlement.periodEnd)}</>
                          : <>desde {shortDate(preview.periodStart)}</>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{chips(preview.chipsDelivered)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.totalSales)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.totalPrizes)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.commission)}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{money(preview.subtotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(preview.previousDebt)}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(preview.totalDue)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {values.onAccountCollected !== 0 ? `− ${money(values.onAccountCollected)}` : money(0)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {settlement
                        ? <span className={`tabular-nums ${awaitingConfirmation ? "text-amber-700" : ""}`} title={awaitingConfirmation ? `Pendiente de confirmar: ${money(values.pendingCollection)}` : undefined}>{money(values.collected)}</span>
                        : <span className="tabular-nums text-muted-foreground" title="Se ajusta al liquidar">{money(values.collected)}</span>}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{chips(preview.chipBalance)}</td>
                    <td className="px-2 py-2 text-right">
                      {settlement
                        ? <span className="tabular-nums">{chips(values.chipsLeft)}</span>
                        : <span className="tabular-nums text-muted-foreground" title="Se ajusta al liquidar">{chips(values.chipsLeft)}</span>}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {awaitingConfirmation ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Cobro pendiente
                        </Badge>
                      ) : status ? (
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => onCompensation?.(target)}
                          title="Configurar comisión"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => onDetail?.(target)}
                          title="Ver cuenta corriente del cajero"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setCollectionTarget({ cashierId: preview.cashierId, username: target.username })}
                          title="Registrar un cobro a cuenta"
                        >
                          <HandCoins className="mr-1 h-3.5 w-3.5" />
                          Cobro
                        </Button>
                        {settlement && awaitingConfirmation && (
                          <Button
                            size="sm"
                            className="h-7 bg-emerald-600 px-2 text-white hover:bg-emerald-700"
                            onClick={() => setConfirmTarget({ settlement, username: target.username })}
                            title="Confirmar que el cajero pagó"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Confirmar
                          </Button>
                        )}
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
                            onClick={() => openLiquidateOne(account)}
                          >
                            {liquidatingId === preview.cashierId && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            Liquidar
                          </Button>
                        )}
                      </div>
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
                <td className="px-2 py-2 text-right">{money(totals.onAccountCollected)}</td>
                <td className="px-2 py-2 text-right">{money(totals.collected)}</td>
                <td className="px-2 py-2 text-right">{chips(totals.chipBalance)}</td>
                <td className="px-2 py-2 text-right">{chips(totals.chipsLeft)}</td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <CashierSettlementDialog
        accounts={dialogAccounts}
        cutoffLabel={shortDate(endOfDayIso(cutoff))}
        submitting={liquidatingAll || liquidatingId !== null}
        onClose={() => setDialogAccounts(null)}
        onConfirm={confirmLiquidation}
      />

      <CashierCollectionDialog
        target={collectionTarget}
        onClose={() => setCollectionTarget(null)}
        onChanged={refreshAfterCollection}
      />

      <ConfirmCollectionDialog
        target={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirmed={refreshAfterCollection}
      />
    </div>
  )
}
