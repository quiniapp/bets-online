"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  XCircle
} from "lucide-react"
import {
  AdminChipPurchaseStatus,
  DEFAULT_ADMIN_CHIP_PRICE_TIERS,
  quoteAdminChipPurchase,
  sortAdminChipTiers
} from "helper"
import type {
  AdminChipPriceTier,
  AdminChipPricingSummary,
  AdminChipPurchase,
  AdminChipPurchaseListResult
} from "helper"

const PAGE_SIZE = 20

const money = (value: number | null | undefined) => `$${formatChips(Number(value) || 0)}`
const chips = (value: number | null | undefined) => formatChips(Number(value) || 0)
const parseNumber = (value: string) => {
  if (value.trim() === "") return NaN
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : NaN
}
const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) return "-"
  const date = new Date(value)
  return `${date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
}
const receiptLabel = (purchase: AdminChipPurchase) => `N.º ${String(purchase.receiptNumber).padStart(6, "0")}`

export const PURCHASE_STATUS: Record<AdminChipPurchaseStatus, { label: string; className: string }> = {
  PENDING: { label: "Pago pendiente", className: "border-amber-200 bg-amber-50 text-amber-700" },
  PAID: { label: "Pagado", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANCELED: { label: "Anulado", className: "border-slate-200 bg-slate-50 text-slate-600" }
}

const tiersLabel = (tiers: AdminChipPriceTier[]) =>
  sortAdminChipTiers(tiers)
    .map(tier => `${chips(tier.minChips)}: ${tier.percentage}%`)
    .join(" · ")

export async function downloadPurchaseReceipt(url: string, purchase: AdminChipPurchase) {
  const blob = await apiService.getBlob(url)
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = `compra-fichas-${String(purchase.receiptNumber).padStart(6, "0")}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

/**
 * Owner: carga de fichas a los admins a precio diferencial. Cada carga genera
 * un comprobante y el pago queda pendiente hasta que el owner lo confirma.
 */
export function AdminChipPurchases() {
  const { toast } = useToast()

  const [admins, setAdmins] = useState<AdminChipPricingSummary[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)

  const [result, setResult] = useState<AdminChipPurchaseListResult | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [adminFilter, setAdminFilter] = useState<string>("ALL")

  const [loadTarget, setLoadTarget] = useState<AdminChipPricingSummary | null>(null)
  const [pricingTarget, setPricingTarget] = useState<AdminChipPricingSummary | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<AdminChipPurchase | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminChipPurchase | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const showError = useCallback(
    (title: string, error: unknown) =>
      toast({
        variant: "destructive",
        title,
        description: error instanceof Error ? error.message : String(error || "Error desconocido")
      }),
    [toast]
  )

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true)
    try {
      const response = await apiService.get<{ admins: AdminChipPricingSummary[] }>("/admin-chip-purchases/admins")
      if (response.success && response.data) setAdmins(response.data.admins)
      else showError("No se pudieron cargar los admins", response.error?.message)
    } catch (error) {
      showError("No se pudieron cargar los admins", error)
    } finally {
      setAdminsLoading(false)
    }
  }, [showError])

  const loadPurchases = useCallback(async () => {
    setListLoading(true)
    try {
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (statusFilter !== "ALL") query.set("status", statusFilter)
      if (adminFilter !== "ALL") query.set("adminId", adminFilter)
      const response = await apiService.get<AdminChipPurchaseListResult>(`/admin-chip-purchases?${query.toString()}`)
      if (response.success && response.data) setResult(response.data)
      else showError("No se pudieron cargar las compras", response.error?.message)
    } catch (error) {
      showError("No se pudieron cargar las compras", error)
    } finally {
      setListLoading(false)
    }
  }, [page, statusFilter, adminFilter, showError])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  useEffect(() => {
    loadPurchases()
  }, [loadPurchases])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, adminFilter])

  const refresh = async () => {
    await Promise.all([loadAdmins(), loadPurchases()])
  }

  const totalPending = useMemo(() => admins.reduce((sum, admin) => sum + admin.pendingAmount, 0), [admins])
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  const download = async (purchase: AdminChipPurchase) => {
    setDownloadingId(purchase.id)
    try {
      await downloadPurchaseReceipt(`/admin-chip-purchases/${purchase.id}/receipt`, purchase)
    } catch (error) {
      showError("No se pudo generar el comprobante", error)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos pendientes de admins</CardTitle>
            <Coins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{money(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {admins.reduce((sum, admin) => sum + admin.pendingCount, 0)} compra(s) sin confirmar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendido a admins</CardTitle>
            <Coins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{money(result?.totals.amount)}</div>
            <p className="text-xs text-muted-foreground">
              {chips(result?.totals.chips)} fichas · cobrado {money(result?.totals.paidAmount)}
              {adminFilter !== "ALL" || statusFilter !== "ALL" ? " · con los filtros" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichas en admins</CardTitle>
            <Coins className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {chips(admins.reduce((sum, admin) => sum + admin.chipBalance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">{admins.length} admin(s)</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold">Administradores</div>
            <div className="text-xs text-muted-foreground">
              El precio de cada carga sale del tramo que alcanza; por debajo del primer tramo, el porcentaje va a mano.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={adminsLoading || listLoading}>
            {adminsLoading || listLoading
              ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              : <RefreshCw className="mr-1 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
        {adminsLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando admins...
          </div>
        ) : admins.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No hay administradores.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Admin</th>
                  <th className="px-3 py-2 text-right font-semibold">Balance</th>
                  <th className="px-3 py-2 text-left font-semibold">Precios</th>
                  <th className="px-3 py-2 text-right font-semibold">Pendiente de pago</th>
                  <th className="px-3 py-2 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map(admin => (
                  <tr key={admin.adminId} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{admin.username}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{chips(admin.chipBalance)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {admin.customTiers && (
                        <Badge variant="outline" className="mr-1 border-violet-200 bg-violet-50 text-violet-700">
                          Propios
                        </Badge>
                      )}
                      {tiersLabel(admin.tiers)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {admin.pendingAmount > 0
                        ? <span className="font-semibold text-amber-700">{money(admin.pendingAmount)}</span>
                        : money(0)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setPricingTarget(admin)}
                          title="Editar precios"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 px-2 text-white hover:bg-emerald-700"
                          onClick={() => setLoadTarget(admin)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Cargar fichas
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">Compras de fichas</div>
          <div className="flex flex-wrap gap-2">
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los admins</SelectItem>
                {admins.map(admin => (
                  <SelectItem key={admin.adminId} value={admin.adminId}>{admin.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value={AdminChipPurchaseStatus.PENDING}>Pago pendiente</SelectItem>
                <SelectItem value={AdminChipPurchaseStatus.PAID}>Pagado</SelectItem>
                <SelectItem value={AdminChipPurchaseStatus.CANCELED}>Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <PurchasesTable
          result={result}
          loading={listLoading}
          showAdmin
          downloadingId={downloadingId}
          onDownload={download}
          renderActions={purchase =>
            purchase.status === AdminChipPurchaseStatus.PENDING && (
              <>
                <Button
                  size="sm"
                  className="h-7 bg-emerald-600 px-2 text-white hover:bg-emerald-700"
                  onClick={() => setConfirmTarget(purchase)}
                  title="Confirmar que el admin pagó"
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Confirmar pago
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-red-600"
                  onClick={() => setCancelTarget(purchase)}
                  title="Anular la compra (se le retiran las fichas)"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </>
            )
          }
        />
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{result ? `${result.total} compra(s)` : ""}</span>
          <div className="flex items-center gap-1">
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

      <LoadChipsDialog
        target={loadTarget}
        onClose={() => setLoadTarget(null)}
        onLoaded={async purchase => {
          setLoadTarget(null)
          await refresh()
          try {
            await downloadPurchaseReceipt(`/admin-chip-purchases/${purchase.id}/receipt`, purchase)
          } catch (error) {
            showError("Se cargaron las fichas pero no se pudo descargar el comprobante", error)
          }
        }}
      />

      <PricingDialog
        target={pricingTarget}
        onClose={() => setPricingTarget(null)}
        onSaved={async () => {
          setPricingTarget(null)
          await loadAdmins()
        }}
      />

      <ConfirmPaymentDialog
        target={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onDone={async () => {
          setConfirmTarget(null)
          await refresh()
        }}
      />

      <CancelPurchaseDialog
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onDone={async () => {
          setCancelTarget(null)
          await refresh()
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function PurchasesTable({
  result,
  loading,
  showAdmin,
  downloadingId,
  onDownload,
  renderActions
}: {
  result: AdminChipPurchaseListResult | null
  loading: boolean
  showAdmin?: boolean
  downloadingId: string | null
  onDownload: (purchase: AdminChipPurchase) => void
  renderActions?: (purchase: AdminChipPurchase) => React.ReactNode
}) {
  if (loading && !result) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando compras...
      </div>
    )
  }
  if (!result || result.purchases.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No hay compras de fichas.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Comprobante</th>
            <th className="px-3 py-2 text-left font-semibold">Fecha</th>
            {showAdmin && <th className="px-3 py-2 text-left font-semibold">Admin</th>}
            <th className="px-3 py-2 text-right font-semibold">Fichas</th>
            <th className="px-3 py-2 text-right font-semibold">Precio</th>
            <th className="px-3 py-2 text-right font-semibold">Importe</th>
            <th className="px-3 py-2 text-center font-semibold">Estado</th>
            <th className="px-3 py-2 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {result.purchases.map(purchase => {
            const status = PURCHASE_STATUS[purchase.status]
            return (
              <tr key={purchase.id} className="hover:bg-muted/20">
                <td className="px-4 py-2 font-medium tabular-nums">{receiptLabel(purchase)}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(purchase.createdAt)}
                </td>
                {showAdmin && <td className="px-3 py-2">{purchase.adminUsername}</td>}
                <td className="px-3 py-2 text-right tabular-nums">{chips(purchase.chips)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {purchase.percentage}%
                  {purchase.manualPercentage && (
                    <span className="ml-1 text-[10px] text-muted-foreground" title="Porcentaje cargado a mano">(manual)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(purchase.amount)}</td>
                <td className="px-3 py-2 text-center">
                  <Badge
                    variant="outline"
                    className={status?.className}
                    title={
                      purchase.status === AdminChipPurchaseStatus.PAID
                        ? `Confirmado ${formatDateTime(purchase.confirmedAt)}${purchase.paymentReference ? ` · ${purchase.paymentReference}` : ""}`
                        : purchase.notes ?? undefined
                    }
                  >
                    {status?.label ?? purchase.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {renderActions?.(purchase)}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={downloadingId === purchase.id}
                      onClick={() => onDownload(purchase)}
                      title="Descargar comprobante"
                    >
                      {downloadingId === purchase.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function LoadChipsDialog({
  target,
  onClose,
  onLoaded
}: {
  target: AdminChipPricingSummary | null
  onClose: () => void
  onLoaded: (purchase: AdminChipPurchase) => void
}) {
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [manualPercentage, setManualPercentage] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState("")

  useEffect(() => {
    if (!target) return
    setAmount("")
    setManualPercentage("")
    setNotes("")
    setIdempotencyKey(crypto.randomUUID())
  }, [target])

  const chipsValue = parseNumber(amount)
  const manualValue = parseNumber(manualPercentage)
  const validChips = Number.isFinite(chipsValue) && chipsValue > 0
  const quote = target && validChips
    ? quoteAdminChipPurchase(target.tiers, chipsValue, Number.isFinite(manualValue) ? manualValue : null)
    : null
  const manualInvalid =
    Boolean(quote?.requiresManualPercentage) &&
    (!Number.isFinite(manualValue) || manualValue < 0 || manualValue > 100)
  const firstTier = target ? sortAdminChipTiers(target.tiers)[0] : null

  const submit = async () => {
    if (!target || saving || !validChips || manualInvalid || !quote) return
    setSaving(true)
    try {
      const response = await apiService.post<{ purchase: AdminChipPurchase }>("/admin-chip-purchases", {
        adminId: target.adminId,
        chips: chipsValue,
        percentage: quote.requiresManualPercentage ? manualValue : undefined,
        notes: notes.trim() || undefined,
        idempotencyKey
      })
      if (response.success && response.data) {
        toast({
          title: `Se cargaron ${chips(chipsValue)} fichas a ${target.username}`,
          description: `Pago pendiente: ${money(response.data.purchase.amount)}`
        })
        onLoaded(response.data.purchase)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las fichas",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las fichas",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar fichas a {target?.username}</DialogTitle>
          <DialogDescription>
            Se le acreditan las fichas ahora y se genera un comprobante. El pago queda pendiente hasta que lo confirmes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <Label htmlFor="purchase-chips">Fichas</Label>
            <Input
              id="purchase-chips"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder="Ej: 1000000"
              disabled={saving}
            />
          </div>

          {quote?.requiresManualPercentage && (
            <div className="space-y-1">
              <Label htmlFor="purchase-percentage">Porcentaje (a mano)</Label>
              <Input
                id="purchase-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={manualPercentage}
                onChange={event => setManualPercentage(event.target.value)}
                placeholder="Ej: 22"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                La carga es menor a {chips(firstTier?.minChips)} fichas (primer tramo).
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="purchase-notes">Notas (opcional)</Label>
            <Input
              id="purchase-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              maxLength={1000}
              disabled={saving}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/30 p-3">
            <dt className="text-muted-foreground">Precio</dt>
            <dd className="text-right tabular-nums">
              {quote?.percentage !== null && quote?.percentage !== undefined ? `${quote.percentage}%` : "—"}
              {quote?.tier && (
                <span className="ml-1 text-xs text-muted-foreground">(desde {chips(quote.tier.minChips)})</span>
              )}
            </dd>
            <dt className="font-semibold">Importe a pagar</dt>
            <dd className="text-right font-semibold tabular-nums">
              {quote?.amount !== null && quote?.amount !== undefined ? money(quote.amount) : "—"}
            </dd>
          </dl>
          {target && (
            <p className="text-xs text-muted-foreground">Tramos: {tiersLabel(target.tiers)}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={saving || !validChips || manualInvalid || !quote || quote.amount === null}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Cargar y generar comprobante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface TierInput {
  minChips: string
  percentage: string
}

const toInputs = (tiers: ReadonlyArray<AdminChipPriceTier>): TierInput[] =>
  sortAdminChipTiers(tiers).map(tier => ({ minChips: String(tier.minChips), percentage: String(tier.percentage) }))

function PricingDialog({
  target,
  onClose,
  onSaved
}: {
  target: AdminChipPricingSummary | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [rows, setRows] = useState<TierInput[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) setRows(toInputs(target.tiers))
  }, [target])

  const parsed = rows.map(row => ({ minChips: parseNumber(row.minChips), percentage: parseNumber(row.percentage) }))
  const error = (() => {
    if (parsed.length === 0) return "Agregá al menos un tramo"
    if (parsed.some(tier => !Number.isFinite(tier.minChips) || tier.minChips <= 0)) return "Cantidad mínima inválida"
    if (parsed.some(tier => !Number.isFinite(tier.percentage) || tier.percentage < 0 || tier.percentage > 100)) {
      return "Porcentaje inválido (0 a 100)"
    }
    if (new Set(parsed.map(tier => tier.minChips)).size !== parsed.length) return "Hay cantidades mínimas repetidas"
    return null
  })()

  const update = (index: number, field: keyof TierInput, value: string) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const request = async (call: () => Promise<{ success: boolean; error?: { message?: string } }>, ok: string) => {
    setSaving(true)
    try {
      const response = await call()
      if (response.success) {
        toast({ title: ok })
        onSaved()
      } else {
        toast({ variant: "destructive", title: "No se pudo guardar", description: response.error?.message || "Error desconocido" })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo guardar", description: err instanceof Error ? err.message : "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  const save = () => {
    if (!target || error) return
    request(() => apiService.put(`/admin-chip-purchases/admins/${target.adminId}/pricing`, { tiers: parsed }), "Precios actualizados")
  }

  const reset = () => {
    if (!target) return
    request(() => apiService.delete(`/admin-chip-purchases/admins/${target.adminId}/pricing`), "Precios por defecto restaurados")
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Precios de {target?.username}</DialogTitle>
          <DialogDescription>
            Desde cada cantidad de fichas por carga, el admin paga ese porcentaje del monto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
            <span>Desde (fichas)</span>
            <span>Paga (%)</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_7rem_2rem] gap-2">
              <Input
                type="number"
                min="1"
                value={row.minChips}
                onChange={event => update(index, "minChips", event.target.value)}
                disabled={saving}
              />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={row.percentage}
                onChange={event => update(index, "percentage", event.target.value)}
                disabled={saving}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-0"
                onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}
                disabled={saving}
                title="Quitar tramo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows(prev => [...prev, { minChips: "", percentage: "" }])}
            disabled={saving}
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar tramo
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Por defecto: {tiersLabel([...DEFAULT_ADMIN_CHIP_PRICE_TIERS])}
          </p>
        </div>
        <DialogFooter className="gap-2">
          {target?.customTiers && (
            <Button variant="ghost" onClick={reset} disabled={saving} className="mr-auto">
              Usar los por defecto
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || Boolean(error)}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Guardar precios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function ConfirmPaymentDialog({
  target,
  onClose,
  onDone
}: {
  target: AdminChipPurchase | null
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [reference, setReference] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) setReference("")
  }, [target])

  const confirm = async () => {
    if (!target || saving) return
    setSaving(true)
    try {
      const response = await apiService.post(`/admin-chip-purchases/${target.id}/confirm`, {
        paymentReference: reference.trim() || undefined
      })
      if (response.success) {
        toast({ title: "Pago confirmado", description: `${target.adminUsername} · ${money(target.amount)}` })
        onDone()
      } else {
        toast({ variant: "destructive", title: "No se pudo confirmar", description: response.error?.message || "Error desconocido" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo confirmar", description: error instanceof Error ? error.message : "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pago</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                {receiptLabel(target)} · {target.adminUsername}: {chips(target.chips)} fichas al {target.percentage}% ={" "}
                <span className="font-semibold">{money(target.amount)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="purchase-reference">Referencia del pago (opcional)</Label>
          <Input
            id="purchase-reference"
            value={reference}
            onChange={event => setReference(event.target.value)}
            maxLength={255}
            placeholder="Ej: transferencia 1234"
            disabled={saving}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={confirm} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar que recibí el pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CancelPurchaseDialog({
  target,
  onClose,
  onDone
}: {
  target: AdminChipPurchase | null
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) setReason("")
  }, [target])

  const cancel = async () => {
    if (!target || saving) return
    setSaving(true)
    try {
      const response = await apiService.post(`/admin-chip-purchases/${target.id}/cancel`, {
        reason: reason.trim() || undefined
      })
      if (response.success) {
        toast({ title: "Compra anulada", description: `Se le retiraron ${chips(target.chips)} fichas a ${target.adminUsername}` })
        onDone()
      } else {
        toast({ variant: "destructive", title: "No se pudo anular", description: response.error?.message || "Error desconocido" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo anular", description: error instanceof Error ? error.message : "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular compra {target && receiptLabel(target)}</DialogTitle>
          <DialogDescription>
            Se le retiran {target && chips(target.chips)} fichas a {target?.adminUsername}. Solo se puede si todavía las tiene.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="purchase-cancel-reason">Motivo (opcional)</Label>
          <Input
            id="purchase-cancel-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={1000}
            disabled={saving}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Volver</Button>
          <Button variant="destructive" onClick={cancel} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Anular compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
