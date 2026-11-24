"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Coins } from "lucide-react"
import type { AdminChipPurchase, AdminChipPurchaseListResult } from "helper"
import { PurchasesTable, downloadPurchaseReceipt } from "@/components/admin/admin-chip-purchases"

const PAGE_SIZE = 20
const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`

/** Admin: sus compras de fichas al owner y los comprobantes (solo lectura). */
export function OwnChipPurchases() {
  const { toast } = useToast()
  const [result, setResult] = useState<AdminChipPurchaseListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.get<AdminChipPurchaseListResult>(
        `/admin-chip-purchases/me?page=${page}&limit=${PAGE_SIZE}`
      )
      if (response.success && response.data) setResult(response.data)
      else toast({ variant: "destructive", title: "No se pudieron cargar tus compras", description: response.error?.message })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar tus compras",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => {
    load()
  }, [load])

  const download = async (purchase: AdminChipPurchase) => {
    setDownloadingId(purchase.id)
    try {
      await downloadPurchaseReceipt(`/admin-chip-purchases/me/${purchase.id}/receipt`, purchase)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el comprobante",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de pago al owner</CardTitle>
            <Coins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{money(result?.totals.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">Hasta que el owner confirme que recibió el pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichas compradas</CardTitle>
            <Coins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatChips(result?.totals.chips ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              total {money(result?.totals.amount)} · pagado {money(result?.totals.paidAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <PurchasesTable
          result={result}
          loading={loading}
          downloadingId={downloadingId}
          onDownload={download}
        />
        <div className="flex items-center justify-end gap-1 border-t px-4 py-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>{page} / {totalPages}</span>
          <Button variant="ghost" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
