"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Loader2, XCircle } from "lucide-react"
import type { CashierCollection } from "helper"

const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`
const dateTime = (value: Date | string) =>
  new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })

export interface CollectionTarget {
  cashierId: string
  username: string
}

interface Props {
  /** Cajero al que se le registra el cobro; `null` cierra el diálogo. */
  target: CollectionTarget | null
  onClose: () => void
  /** Se llama después de registrar o anular un cobro. */
  onChanged: () => void
}

/**
 * Cobro a cuenta: lo que el cajero va pagando durante la semana. Se descuenta
 * del total en su próxima liquidación.
 */
export function CashierCollectionDialog({ target, onClose, onChanged }: Props) {
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [collections, setCollections] = useState<CashierCollection[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const loadCollections = useCallback(async (cashierId: string) => {
    setLoadingList(true)
    try {
      const response = await apiService.get<{ collections: CashierCollection[] }>(
        `/cashier-accounts/${cashierId}/collections`
      )
      const list = response.success ? response.data?.collections : undefined
      setCollections(Array.isArray(list) ? list : [])
    } catch {
      setCollections([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (!target) return
    setAmount("")
    setReference("")
    setNotes("")
    setCollections([])
    loadCollections(target.cashierId)
  }, [target, loadCollections])

  const save = async () => {
    if (!target || saving) return
    const value = Number(amount.replace(",", "."))
    if (!Number.isFinite(value) || value <= 0) {
      toast({ variant: "destructive", title: "Monto inválido", description: "Ingresá un monto mayor a cero." })
      return
    }
    setSaving(true)
    try {
      const response = await apiService.post(`/cashier-accounts/${target.cashierId}/collections`, {
        amount: value,
        paymentReference: reference.trim() || undefined,
        notes: notes.trim() || undefined
      })
      if (response.success) {
        toast({ title: `Cobro de ${money(value)} registrado a ${target.username}` })
        onChanged()
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo registrar el cobro",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el cobro",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setSaving(false)
    }
  }

  const cancelCollection = async (collection: CashierCollection) => {
    if (!target || cancelingId) return
    if (!window.confirm(`¿Anular el cobro de ${money(collection.amount)}?`)) return
    setCancelingId(collection.id)
    try {
      const response = await apiService.post(`/cashier-accounts/collections/${collection.id}/cancel`, {})
      if (response.success) {
        toast({ title: "Cobro anulado" })
        await loadCollections(target.cashierId)
        onChanged()
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo anular el cobro",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo anular el cobro",
        description: err instanceof Error ? err.message : "Error de conexión"
      })
    } finally {
      setCancelingId(null)
    }
  }

  const total = collections.reduce((acc, collection) => acc + Number(collection.amount), 0)

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="w-[95vw] max-h-[95dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cobro a {target?.username}</DialogTitle>
          <DialogDescription>
            Registrá lo que el cajero te paga durante la semana. Se descuenta del total en su próxima liquidación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <Label htmlFor="on-account-amount">Monto ($)</Label>
            <Input
              id="on-account-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              disabled={saving}
              className="text-right"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="on-account-reference">Referencia (opcional)</Label>
            <Input
              id="on-account-reference"
              value={reference}
              onChange={event => setReference(event.target.value)}
              placeholder="Efectivo, transferencia, etc."
              maxLength={255}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="on-account-notes">Nota (opcional)</Label>
            <Input
              id="on-account-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              maxLength={1000}
              disabled={saving}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Cobros a cuenta sin liquidar</span>
              {collections.length > 0 && <span className="font-semibold tabular-nums">{money(total)}</span>}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {loadingList ? (
                <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
                </div>
              ) : collections.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">Todavía no hay cobros esta semana.</div>
              ) : (
                collections.map(collection => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium tabular-nums">{money(collection.amount)}</div>
                      <div className="truncate text-muted-foreground">
                        {dateTime(collection.createdAt)}
                        {collection.paymentReference ? ` · ${collection.paymentReference}` : ""}
                        {collection.notes ? ` · ${collection.notes}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                      disabled={cancelingId !== null}
                      onClick={() => cancelCollection(collection)}
                      title="Anular cobro"
                    >
                      {cancelingId === collection.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <XCircle className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Registrar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
