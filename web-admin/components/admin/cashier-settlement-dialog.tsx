"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatChips } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import type { CashierPeriodAccount } from "helper"

const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`
const chips = (value: number | null | undefined) => formatChips(Number(value) || 0)
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })

export interface SettlementValues {
  collected: number
  chipsLeft: number
}

interface RowInput {
  collected: string
  chipsLeft: string
}

/** Valores sugeridos: cobrar lo que queda (total − cobros a cuenta) y dejarle todas las no vendidas. */
export const defaultSettlementValues = ({ preview }: CashierPeriodAccount): SettlementValues => ({
  collected: Math.max(preview.amountDue, 0),
  chipsLeft: preview.unsoldChips
})

const parseAmount = (value: string) => {
  if (value.trim() === "") return NaN
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : NaN
}

const toValues = (input: RowInput): SettlementValues => ({
  collected: parseAmount(input.collected),
  chipsLeft: parseAmount(input.chipsLeft)
})

const valuesError = (account: CashierPeriodAccount, { collected, chipsLeft }: SettlementValues) => {
  if (!Number.isFinite(collected) || collected < 0) return "Cobro inválido"
  if (!Number.isFinite(chipsLeft) || chipsLeft < 0) return "No vendidas inválidas"
  if (chipsLeft > account.preview.unsoldChips) {
    return `No puede dejarle más de ${chips(account.preview.unsoldChips)} fichas (balance sin las de premios)`
  }
  return null
}

interface Props {
  /** Cajeros a liquidar; `null` cierra el diálogo. */
  accounts: CashierPeriodAccount[] | null
  cutoffLabel: string
  submitting: boolean
  onClose: () => void
  onConfirm: (values: Record<string, SettlementValues>) => void
}

export function CashierSettlementDialog({ accounts, cutoffLabel, submitting, onClose, onConfirm }: Props) {
  const [inputs, setInputs] = useState<Record<string, RowInput>>({})
  const [loadedFor, setLoadedFor] = useState<CashierPeriodAccount[] | null>(null)

  // Al abrir con otros cajeros, reinicia los campos con los valores sugeridos.
  if (accounts !== loadedFor) {
    setLoadedFor(accounts)
    if (accounts) {
      setInputs(
        Object.fromEntries(
          accounts.map(account => {
            const defaults = defaultSettlementValues(account)
            return [
              account.preview.cashierId,
              { collected: String(defaults.collected), chipsLeft: String(defaults.chipsLeft) }
            ]
          })
        )
      )
    }
  }

  const list = accounts ?? []
  const single = list.length === 1 ? list[0] : null

  const rows = list.map(account => {
    const input = inputs[account.preview.cashierId]
    const values = input ? toValues(input) : defaultSettlementValues(account)
    const chipsLeft = Number.isFinite(values.chipsLeft) ? values.chipsLeft : 0
    return {
      account,
      input,
      values,
      error: valuesError(account, values),
      recoveredUnsold: round(account.preview.unsoldChips - chipsLeft)
    }
  })
  const hasErrors = rows.some(row => row.error)

  const setField = (cashierId: string, field: keyof RowInput, value: string) => {
    setInputs(prev => ({ ...prev, [cashierId]: { ...prev[cashierId], [field]: value } }))
  }

  const submit = () => {
    if (hasErrors) return
    onConfirm(Object.fromEntries(rows.map(row => [row.account.preview.cashierId, row.values])))
  }

  const field = (cashierId: string, name: keyof RowInput, className: string, id?: string) => (
    <Input
      id={id}
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      value={inputs[cashierId]?.[name] ?? ""}
      onChange={event => setField(cashierId, name, event.target.value)}
      disabled={submitting}
      className={className}
    />
  )

  const totals = rows.reduce(
    (acc, row) => ({
      amountDue: acc.amountDue + row.account.preview.amountDue,
      collected: acc.collected + (Number.isFinite(row.values.collected) ? row.values.collected : 0),
      chipBalance: acc.chipBalance + row.account.preview.chipBalance,
      chipsLeft: acc.chipsLeft + (Number.isFinite(row.values.chipsLeft) ? row.values.chipsLeft : 0)
    }),
    { amountDue: 0, collected: 0, chipBalance: 0, chipsLeft: 0 }
  )

  return (
    <Dialog open={Boolean(accounts)} onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent
        className={`w-[95vw] max-h-[95dvh] overflow-y-auto ${single ? "max-w-md" : "max-w-4xl"}`}
      >
        <DialogHeader>
          <DialogTitle>
            {single ? `Liquidar a ${single.preview.cashierUsername}` : `Liquidar ${list.length} cajeros`}
          </DialogTitle>
          <DialogDescription>
            {single
              ? `Del ${shortDate(single.preview.periodStart)} al ${shortDate(single.preview.periodEnd)}.`
              : `Hasta el ${cutoffLabel}.`}{" "}
            Ajustá el cobro y las fichas no vendidas que le quedan. El cobro queda pendiente hasta que
            confirmes que el cajero pagó.
          </DialogDescription>
        </DialogHeader>

        {single && rows[0] ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/30 p-3">
              <dt className="text-muted-foreground">Venta de fichas</dt>
              <dd className="text-right tabular-nums">{money(single.preview.totalSales)}</dd>
              <dt className="text-muted-foreground">Comisión</dt>
              <dd className="text-right tabular-nums">− {money(single.preview.commission)}</dd>
              {single.preview.prizesDeducted && (
                <>
                  <dt className="text-muted-foreground">Premios</dt>
                  <dd className="text-right tabular-nums">− {money(single.preview.totalPrizes)}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-right tabular-nums">{money(single.preview.subtotal)}</dd>
              <dt className="text-muted-foreground">Saldo anterior</dt>
              <dd className="text-right tabular-nums">{money(single.preview.previousDebt)}</dd>
              {single.preview.onAccountCollected !== 0 && (
                <>
                  <dt className="text-muted-foreground">Cobro (a cuenta)</dt>
                  <dd className="text-right tabular-nums">− {money(single.preview.onAccountCollected)}</dd>
                </>
              )}
              <dt className="font-semibold">Total</dt>
              <dd className="text-right font-semibold tabular-nums">{money(single.preview.amountDue)}</dd>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="settlement-collected">Cobro ($)</Label>
                {field(single.preview.cashierId, "collected", "text-right", "settlement-collected")}
                <p className="text-xs text-muted-foreground">Queda pendiente de confirmar</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="settlement-chips-left">No vendidas (fichas)</Label>
                {field(single.preview.cashierId, "chipsLeft", "text-right", "settlement-chips-left")}
                <p className="text-xs text-muted-foreground">
                  Balance: {chips(single.preview.chipBalance)}
                </p>
              </div>
            </div>

            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Se le retiran {chips(single.preview.prizeChipsToRecover)} fichas de premios.</li>
              {rows[0].recoveredUnsold > 0 && (
                <li>• Se le retiran {chips(rows[0].recoveredUnsold)} fichas no vendidas.</li>
              )}
            </ul>

            {rows[0].error && <p className="text-sm text-red-600">{rows[0].error}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Cajero</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-right font-semibold">Cobro</th>
                  <th className="px-2 py-2 text-right font-semibold">Balance</th>
                  <th className="px-2 py-2 text-right font-semibold">No vendidas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => {
                  const { preview } = row.account
                  return (
                    <tr key={preview.cashierId} className={row.error ? "bg-red-50" : undefined}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{preview.cashierUsername}</div>
                        <div className="text-[10px] text-muted-foreground">
                          desde {shortDate(preview.periodStart)}
                        </div>
                        {row.error && <div className="text-[10px] text-red-600">{row.error}</div>}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(preview.amountDue)}</td>
                      <td className="px-2 py-2 text-right">
                        {field(preview.cashierId, "collected", "ml-auto h-7 w-28 text-right text-xs")}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{chips(preview.chipBalance)}</td>
                      <td className="px-2 py-2 text-right">
                        {field(preview.cashierId, "chipsLeft", "ml-auto h-7 w-28 text-right text-xs")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="px-3 py-2">Totales</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(totals.amountDue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(totals.collected)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{chips(totals.chipBalance)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{chips(totals.chipsLeft)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || hasErrors}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {single ? "Confirmar liquidación" : `Liquidar ${list.length} cajero(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
