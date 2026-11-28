"use client"

import { useEffect, useState } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import type { CashierSettlement } from "helper"

const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`
const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

export interface ConfirmCollectionTarget {
  settlement: CashierSettlement
  username: string
}

interface Props {
  /** Liquidación con cobro pendiente; `null` cierra el diálogo. */
  target: ConfirmCollectionTarget | null
  onClose: () => void
  onConfirmed: () => void
}

/**
 * El owner confirma que recibió el cobro pendiente de una liquidación. Si
 * recibió menos, la diferencia queda como deuda del cajero.
 */
export function ConfirmCollectionDialog({ target, onClose, onConfirmed }: Props) {
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [saving, setSaving] = useState(false)

  const pending = Number(target?.settlement.pendingCollection ?? 0)

  useEffect(() => {
    if (!target) return
    setAmount(String(Number(target.settlement.pendingCollection ?? 0)))
    setReference("")
  }, [target])

  const value = Number(amount.replace(",", "."))
  const invalid = !Number.isFinite(value) || value <= 0
  const remaining = Math.round((pending - (invalid ? 0 : value)) * 100) / 100

  const confirm = async () => {
    if (!target || saving || invalid) return
    setSaving(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/settlements/${target.settlement.id}/confirm-collection`,
        { amount: value, paymentReference: reference.trim() || undefined }
      )
      if (response.success) {
        toast({ title: `Cobro de ${money(value)} confirmado` })
        onConfirmed()
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo confirmar el cobro",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo confirmar el cobro",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar cobro de {target?.username}</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                Liquidación del {shortDate(target.settlement.periodStart)} al{" "}
                {shortDate(target.settlement.periodEnd)}.{" "}
              </>
            )}
            Confirmá cuánto te pagó el cajero. Si es menos de lo pendiente, la diferencia queda como deuda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Pendiente de cobro</div>
            <div className="text-2xl font-bold text-amber-700">{money(pending)}</div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-amount">Monto recibido ($)</Label>
            <Input
              id="confirm-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              disabled={saving}
              className="text-right"
            />
            {!invalid && remaining > 0 && (
              <p className="text-xs text-amber-700">Quedan {money(remaining)} como deuda del cajero.</p>
            )}
            {!invalid && remaining < 0 && (
              <p className="text-xs text-muted-foreground">
                Recibiste {money(-remaining)} de más: queda a favor del cajero.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-reference">Referencia (opcional)</Label>
            <Input
              id="confirm-reference"
              value={reference}
              onChange={event => setReference(event.target.value)}
              placeholder="Efectivo, transferencia, etc."
              maxLength={255}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={saving || invalid}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
