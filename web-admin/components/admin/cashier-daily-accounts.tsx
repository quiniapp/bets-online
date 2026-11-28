"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useCashierDailyAccounts } from "@/hooks/useCashierDailyAccounts"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { Download, FileText, Loader2, RefreshCw, Save } from "lucide-react"
import type {
  CashierDailyAccount,
  UpdateCashierDailyAccountDto
} from "helper"

const money = (value: number | null | undefined) =>
  `$${formatChips(Number(value) || 0)}`

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function CashierDailyAccounts() {
  const { toast } = useToast()
  const [date, setDate] = useState(toDateInput(new Date()))
  const { accounts, totals, loading, error, reload } = useCashierDailyAccounts(date)
  const [edits, setEdits] = useState<Record<string, Partial<UpdateCashierDailyAccountDto>>>({})
  const [saving, setSaving] = useState(false)
  const [liquidating, setLiquidating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const setField = (
    account: CashierDailyAccount,
    field: keyof UpdateCashierDailyAccountDto,
    value: string
  ) => {
    setEdits(prev => ({
      ...prev,
      [account.id]: {
        ...prev[account.id],
        [field]: value === "" ? 0 : Number(value)
      }
    }))
  }

  const valueOf = (
    account: CashierDailyAccount,
    field: keyof UpdateCashierDailyAccountDto
  ) => edits[account.id]?.[field] ?? account[field]

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

  const saveChanges = async () => {
    const entries = Object.entries(edits)
    if (entries.length === 0) return

    setSaving(true)
    try {
      let failed = 0
      for (const [id, fields] of entries) {
        const response = await apiService.put(`/cashier-accounts/daily/${id}`, fields)
        if (!response.success) {
          failed += 1
          toast({
            variant: "destructive",
            title: "No se pudo guardar una cuenta",
            description: response.error?.message || "Error desconocido"
          })
        }
      }
      setEdits({})
      await reload(date)
      if (failed === 0) {
        toast({ title: "Cuenta corriente actualizada" })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudieron guardar los cambios",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setSaving(false)
    }
  }

  const liquidateDay = async () => {
    if (!window.confirm(`¿Liquidar todos los cajeros del día ${date}?`)) return
    setLiquidating(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/daily/liquidate?date=${encodeURIComponent(date)}`
      )
      if (response.success) {
        toast({ title: "Día liquidado" })
        setEdits({})
        await reload(date)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo liquidar el día",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo liquidar el día",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setLiquidating(false)
    }
  }

  const downloadSummary = async () => {
    try {
      const blob = await apiService.getBlob(
        `/cashier-accounts/daily/summary.pdf?date=${encodeURIComponent(date)}`
      )
      downloadBlob(blob, `resumen-cuenta-corriente-${date}.pdf`)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el resumen",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    }
  }

  const downloadAccount = async (account: CashierDailyAccount) => {
    setDownloadingId(account.id)
    try {
      const blob = await apiService.getBlob(
        `/cashier-accounts/daily/${account.id}/receipt`
      )
      downloadBlob(blob, `cuenta-corriente-${account.cashierUsername}-${account.date}.pdf`)
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

  const renderEditable = (
    account: CashierDailyAccount,
    field: keyof UpdateCashierDailyAccountDto
  ) => (
    <Input
      type="number"
      step="0.01"
      disabled={account.isLiquidated}
      value={valueOf(account, field)}
      onChange={event => setField(account, field, event.target.value)}
      className="ml-auto h-7 w-24 text-right text-xs"
    />
  )

  const hasEdits = Object.keys(edits).length > 0
  const canLiquidate = accounts.some(account => !account.isLiquidated)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Fecha</div>
            <Input
              type="date"
              value={date}
              onChange={event => {
                setDate(event.target.value)
                setEdits({})
              }}
              className="w-44"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => reload(date)} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveChanges}
            disabled={!hasEdits || saving || loading}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Guardar cambios
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSummary}
            disabled={loading || accounts.length === 0}
          >
            <FileText className="mr-1 h-4 w-4" />
            Resumen PDF
          </Button>
          <Button
            size="sm"
            onClick={liquidateDay}
            disabled={loading || liquidating || !canLiquidate}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {liquidating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Liquidar día
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        La comisión se calcula sobre el pase (ventas). Reclamos, cobros, pagos y deje son editables.
        Una vez liquidado el día, la cuenta queda cerrada.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando cuentas del día...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          No hay cajeros para mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1250px] text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cajero</th>
                <th className="px-2 py-2 text-right font-semibold">Pase</th>
                <th className="px-2 py-2 text-right font-semibold">Aciertos</th>
                <th className="px-2 py-2 text-right font-semibold">Reclamos</th>
                <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
                <th className="px-2 py-2 text-right font-semibold">Saldo ant.</th>
                <th className="px-2 py-2 text-right font-semibold">Cobros</th>
                <th className="px-2 py-2 text-right font-semibold">Pagos</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 text-right font-semibold">Arrastre</th>
                <th className="px-2 py-2 text-right font-semibold">Deje</th>
                <th className="px-2 py-2 text-right font-semibold">Comisión</th>
                <th className="px-2 py-2 text-center font-semibold">Estado</th>
                <th className="px-2 py-2 text-right font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{account.cashierUsername}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.pass)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.successes)}</td>
                  <td className="px-2 py-2 text-right">{renderEditable(account, "claims")}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.subtotal)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.previousBalance)}</td>
                  <td className="px-2 py-2 text-right">{renderEditable(account, "collections")}</td>
                  <td className="px-2 py-2 text-right">{renderEditable(account, "paid")}</td>
                  <td className={`px-2 py-2 text-right font-semibold tabular-nums ${account.total > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                    {money(account.total)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.drag)}</td>
                  <td className="px-2 py-2 text-right">{renderEditable(account, "leave")}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(account.cashierCommission)}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={account.isLiquidated
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"}
                    >
                      {account.isLiquidated ? "Liquidada" : "Pendiente"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={downloadingId === account.id}
                      onClick={() => downloadAccount(account)}
                      title="Descargar cuenta del cajero"
                    >
                      {downloadingId === account.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="px-3 py-2">Totales</td>
                  <td className="px-2 py-2 text-right">{money(totals.pass)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.successes)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.claims)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.subtotal)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.previousBalance)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.collections)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.paid)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.total)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.drag)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.leave)}</td>
                  <td className="px-2 py-2 text-right">{money(totals.cashierCommission)}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
