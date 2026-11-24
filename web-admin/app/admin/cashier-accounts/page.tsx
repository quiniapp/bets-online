"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useCashierAccounts, useCashierSettlements } from "@/hooks/useCashierAccounts"
import {
  CashierPeriodAccounts,
  type CashierRowTarget
} from "@/components/admin/cashier-period-accounts"
import { OwnerAccount } from "@/components/admin/owner-account"
import { AdminChipPurchases } from "@/components/admin/admin-chip-purchases"
import { OwnChipPurchases } from "@/components/admin/own-chip-purchases"
import { Switch } from "@/components/ui/switch"
import { BetsReport } from "@/components/admin/bets-report"
import {
  ConfirmCollectionDialog,
  type ConfirmCollectionTarget
} from "@/components/admin/confirm-collection-dialog"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import {
  ChevronLeft,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  HandCoins,
  Loader2,
  Percent,
  Wallet,
  XCircle
} from "lucide-react"
import {
  CompensationType,
  SettlementStatus,
  UserRole
} from "helper"
import type {
  CashierAccountDetail,
  CashierAccountMovement,
  CashierLedgerKind,
  CashierSettlement,
  CashierSettlementWithCashier
} from "helper"

const ITEMS_PER_PAGE = 20

const TABS = ["period", "settlements", "owner", "admins", "purchases", "bets"] as const
type FinanceTab = (typeof TABS)[number]

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Sin cobrar",
  PAID: "Cobrada",
  CANCELED: "Cancelada",
  PARTIALLY_PAID: "Cobro parcial"
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-red-100 text-red-800 border-red-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELED: "bg-slate-100 text-slate-700 border-slate-200",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800 border-blue-200"
}

const LEDGER_LABELS: Record<CashierLedgerKind, string> = {
  CHIPS_DELIVERED: "Entrega de fichas",
  CHIPS_RETURNED: "Retiro de fichas",
  SALE: "Venta de fichas",
  PRIZE: "Premio (fichas del jugador)",
  PLAYER_RETURN: "Retiro a jugador",
  PRIZE_CHIPS_RECOVERED: "Liquidación: retiro fichas de premios",
  UNSOLD_CHIPS_RECOVERED: "Liquidación: retiro fichas no vendidas",
  SETTLEMENT_REVERSAL: "Anulación: devolución de fichas",
  SETTLEMENT: "Liquidación (subtotal)",
  COLLECTION: "Cobro",
  OTHER: "Otro"
}

const formatDate = (value: Date | string | null | undefined, withTime = false) => {
  if (!value) return "-"
  const date = new Date(value)
  const datePart = date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
  if (!withTime) return datePart
  const timePart = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  })
  return `${datePart} ${timePart}`
}

const formatMoney = (value: number | null | undefined) => {
  const amount = Number(value) || 0
  return `${amount < 0 ? "−" : ""}$${formatChips(Math.abs(amount))}`
}
const formatChipsAmount = (value: number | null | undefined) => formatChips(Number(value) || 0)
const signed = (value: number, render: (v: number) => string) =>
  value === 0 ? "—" : `${value > 0 ? "+" : "−"}${render(Math.abs(value))}`

const isLegacy = (settlement: CashierSettlement) =>
  settlement.subtotal === null || settlement.subtotal === undefined

const parseNumber = (value: string) => Number(value.replace(",", "."))

export default function CashierAccountsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { role, isLoading: authLoading } = useAuth()

  const [tab, setTab] = useState<FinanceTab>("period")
  const [settlementsPage, setSettlementsPage] = useState(1)

  // Pestaña inicial desde ?tab= (links del menú). Se lee en el cliente para no
  // necesitar un Suspense por useSearchParams.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab")
    if (requested && (TABS as readonly string[]).includes(requested)) setTab(requested as FinanceTab)
  }, [])

  const changeTab = (value: string) => {
    setTab(value as FinanceTab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    window.history.replaceState(null, "", url.toString())
  }
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>("ALL")

  // Solo para las tarjetas de resumen (el resumen suma todos los cajeros).
  const { summary, reload: reloadAccounts } = useCashierAccounts({ page: 1, limit: 1 })

  const {
    settlements,
    loading: settlementsLoading,
    error: settlementsError,
    pagination: settlementsPagination,
    reload: reloadSettlements
  } = useCashierSettlements({
    page: settlementsPage,
    limit: ITEMS_PER_PAGE,
    status: settlementStatusFilter === "ALL"
      ? undefined
      : (settlementStatusFilter as SettlementStatus)
  })

  useEffect(() => {
    setSettlementsPage(1)
  }, [settlementStatusFilter])

  // El owner y los admins liquidan a los cajeros que tienen a cargo.
  const isOwner = role === UserRole.OWNER
  const canSettle = role === UserRole.OWNER || role === UserRole.ADMIN

  useEffect(() => {
    if (!authLoading && !canSettle) {
      router.replace("/admin/dashboard")
    }
  }, [authLoading, canSettle, router])

  // Pestañas que solo ve un rol: si la URL pide la del otro, volver a Liquidar.
  useEffect(() => {
    if (authLoading) return
    if ((tab === "admins" && !isOwner) || (tab === "purchases" && role !== UserRole.ADMIN)) setTab("period")
  }, [authLoading, isOwner, role, tab])

  const [compensationAccount, setCompensationAccount] = useState<CashierRowTarget | null>(null)
  const [compensationPercentage, setCompensationPercentage] = useState("")
  const [compensationPrizes, setCompensationPrizes] = useState(false)
  const [savingCompensation, setSavingCompensation] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState<ConfirmCollectionTarget | null>(null)

  const [cancelingSettlement, setCancelingSettlement] = useState<CashierSettlementWithCashier | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [canceling, setCanceling] = useState(false)

  const [detailAccount, setDetailAccount] = useState<CashierRowTarget | null>(null)
  const [detail, setDetail] = useState<CashierAccountDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)
  const [periodRefreshKey, setPeriodRefreshKey] = useState(0)

  const refreshAll = useCallback(async () => {
    await Promise.all([reloadAccounts(), reloadSettlements()])
  }, [reloadAccounts, reloadSettlements])

  const downloadReceipt = async (settlementId: string, cashierUsername?: string) => {
    setDownloadingReceiptId(settlementId)
    try {
      const blob = await apiService.getBlob(
        `/cashier-accounts/settlements/${settlementId}/receipt`
      )
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `liquidacion-${cashierUsername ?? settlementId.slice(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo generar el comprobante",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  const openCompensation = (target: CashierRowTarget) => {
    setCompensationAccount(target)
    setCompensationPercentage(target.percentage !== null ? String(target.percentage) : "")
    setCompensationPrizes(target.prizesAffectSubtotal)
  }

  const saveCompensation = async () => {
    if (!compensationAccount || savingCompensation) return
    const percentage = parseNumber(compensationPercentage)
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast({
        variant: "destructive",
        title: "Porcentaje inválido",
        description: "Ingresá un porcentaje entre 0 y 100."
      })
      return
    }

    setSavingCompensation(true)
    try {
      const response = await apiService.put(
        `/cashier-accounts/${compensationAccount.cashierId}/compensation`,
        { type: CompensationType.PERCENTAGE, percentage, prizesAffectSubtotal: compensationPrizes }
      )
      if (response.success) {
        toast({ title: "Comisión actualizada" })
        setCompensationAccount(null)
        await refreshAll()
        setPeriodRefreshKey(key => key + 1)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo guardar",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setSavingCompensation(false)
    }
  }

  const onCollectionConfirmed = async () => {
    await refreshAll()
    setPeriodRefreshKey(key => key + 1)
  }

  const openCancel = (settlement: CashierSettlementWithCashier) => {
    setCancelingSettlement(settlement)
    setCancelReason("")
  }

  const cancelSettlement = async () => {
    if (!cancelingSettlement || canceling) return
    setCanceling(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/settlements/${cancelingSettlement.id}/cancel`,
        { reason: cancelReason.trim() || undefined }
      )
      if (response.success) {
        toast({ title: "Liquidación cancelada" })
        setCancelingSettlement(null)
        await refreshAll()
        setPeriodRefreshKey(key => key + 1)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo cancelar",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cancelar",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setCanceling(false)
    }
  }

  const openDetail = async (account: CashierRowTarget) => {
    setDetailAccount(account)
    setDetail(null)
    setDetailLoading(true)
    try {
      const response = await apiService.get<CashierAccountDetail>(
        `/cashier-accounts/${account.cashierId}`
      )
      if (response.success && response.data) {
        setDetail(response.data)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo cargar la cuenta",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cargar la cuenta",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const totalPagesSettlements = settlementsPagination?.totalPages ?? 1

  const settlementsRangeLabel = useMemo(() => {
    if (!settlementsPagination || settlementsPagination.total === 0) return "Sin liquidaciones"
    const from = (settlementsPagination.page - 1) * settlementsPagination.limit + 1
    const to = Math.min(settlementsPagination.page * settlementsPagination.limit, settlementsPagination.total)
    return `${from}-${to} de ${settlementsPagination.total}`
  }, [settlementsPagination])

  if (!authLoading && !canSettle) {
    return null
  }

  const ledgerRow = (movement: CashierAccountMovement) => (
    <div
      key={movement.id}
      className="grid items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
      style={{ gridTemplateColumns: "7.5rem 1fr 6.5rem 6.5rem" }}
    >
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatDate(movement.createdAt, true)}
      </span>
      <div className="min-w-0">
        <div className="font-medium">
          {LEDGER_LABELS[movement.kind] ?? movement.kind}
          {movement.playerUsername && movement.kind !== "SETTLEMENT" && movement.kind !== "COLLECTION"
            ? ` · ${movement.playerUsername}`
            : ""}
        </div>
        {movement.description && (
          <div className="truncate text-xs text-muted-foreground">{movement.description}</div>
        )}
      </div>
      <span className={`text-right tabular-nums ${movement.chips > 0 ? "text-emerald-600" : movement.chips < 0 ? "text-red-600" : "text-muted-foreground"}`}>
        {signed(movement.chips, formatChipsAmount)}
      </span>
      <span className={`text-right font-semibold tabular-nums ${movement.money > 0 ? "text-amber-700" : movement.money < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
        {signed(movement.money, v => `$${formatChips(v)}`)}
      </span>
    </div>
  )

  return (
    <DashboardLayout title="Finanzas">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Finanzas</h2>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Liquidaciones de tus cajeros, compra de fichas de los admins, tu ganancia y caja, y el reporte de apuestas."
                : "Liquidaciones y cuentas corrientes de tus cajeros, tu ganancia y caja, tus compras de fichas y el reporte de apuestas."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A cobrar a cajeros</CardTitle>
              <HandCoins className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatMoney(summary.balanceDue)}</div>
              <p className="text-xs text-muted-foreground">
                deuda {formatMoney(summary.debt)} · sin liquidar {formatMoney(summary.openSubtotal)}
                {summary.onAccountCollected !== 0 && <> · a cuenta −{formatMoney(summary.onAccountCollected)}</>}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Venta de fichas</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatMoney(summary.totalSales)}</div>
              <p className="text-xs text-muted-foreground">
                premios {formatMoney(summary.totalPrizes)} · histórico
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones de cajeros</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary.totalCommission)}</div>
              <p className="text-xs text-muted-foreground">
                cobrado a cajeros {formatMoney(summary.totalCollected)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas en cajeros</CardTitle>
              <Coins className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatChipsAmount(summary.chipBalance)}</div>
              <p className="text-xs text-muted-foreground">{summary.totalCashiers} cajeros a cargo</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="period">Liquidar</TabsTrigger>
            <TabsTrigger value="settlements">Historial de liquidaciones</TabsTrigger>
            <TabsTrigger value="owner">{isOwner ? "Cuenta del owner" : "Mi cuenta"}</TabsTrigger>
            {isOwner && <TabsTrigger value="admins">Vender fichas</TabsTrigger>}
            {role === UserRole.ADMIN && <TabsTrigger value="purchases">Mis compras de fichas</TabsTrigger>}
            <TabsTrigger value="bets">Apuestas</TabsTrigger>
          </TabsList>

          <TabsContent value="period" className="space-y-4">
            <CashierPeriodAccounts
              key={periodRefreshKey}
              onChanged={refreshAll}
              onCompensation={openCompensation}
              onDetail={openDetail}
            />
          </TabsContent>

          <TabsContent value="settlements" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="w-full max-w-xs">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={settlementStatusFilter} onValueChange={setSettlementStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas</SelectItem>
                      <SelectItem value={SettlementStatus.PENDING}>Sin cobrar</SelectItem>
                      <SelectItem value={SettlementStatus.PARTIALLY_PAID}>Cobro parcial</SelectItem>
                      <SelectItem value={SettlementStatus.PAID}>Cobradas</SelectItem>
                      <SelectItem value={SettlementStatus.CANCELED}>Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">{settlementsRangeLabel}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {settlementsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando liquidaciones...
                  </div>
                ) : settlementsError ? (
                  <div className="py-16 text-center text-sm text-red-600">{settlementsError}</div>
                ) : settlements.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    No hay liquidaciones para el filtro seleccionado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] text-sm">
                      <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Cajero</th>
                          <th className="px-3 py-3 text-left font-semibold">Período</th>
                          <th className="px-3 py-3 text-right font-semibold">Venta</th>
                          <th className="px-3 py-3 text-right font-semibold">Premios</th>
                          <th className="px-3 py-3 text-right font-semibold">Comisión</th>
                          <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
                          <th className="px-3 py-3 text-right font-semibold">Cobrado</th>
                          <th className="px-3 py-3 text-right font-semibold" title="Cobro de la liquidación que falta confirmar">Pendiente</th>
                          <th className="px-3 py-3 text-right font-semibold" title="Lo que el cajero queda debiendo (incluye lo pendiente)">Debe</th>
                          <th className="px-3 py-3 text-center font-semibold">Estado</th>
                          <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {settlements.map(settlement => {
                          const legacy = isLegacy(settlement)
                          const commission = settlement.commission ?? settlement.payableAmount
                          const pending = Number(settlement.pendingCollection ?? 0)
                          const awaitingConfirmation =
                            !legacy && settlement.status !== SettlementStatus.CANCELED && pending > 0
                          return (
                            <tr key={settlement.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">{settlement.cashierUsername}</td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">
                                {formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">{formatMoney(settlement.totalSales)}</td>
                              <td className="px-3 py-3 text-right tabular-nums">{formatMoney(settlement.totalPrizesPaid)}</td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                {formatMoney(commission)}
                                {settlement.percentage !== null && settlement.percentage !== undefined && (
                                  <div className="text-[10px] text-muted-foreground">{settlement.percentage}%</div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                {legacy ? "—" : formatMoney(settlement.subtotal)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                {legacy ? "—" : formatMoney(settlement.collected)}
                              </td>
                              <td className={`px-3 py-3 text-right tabular-nums ${awaitingConfirmation ? "text-amber-700" : "text-muted-foreground"}`}>
                                {legacy || pending === 0 ? "—" : formatMoney(pending)}
                              </td>
                              <td className={`px-3 py-3 text-right font-semibold tabular-nums ${(settlement.debtCarried ?? 0) > 0 ? "text-amber-700" : ""}`}>
                                {legacy ? "—" : formatMoney(settlement.debtCarried)}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {awaitingConfirmation ? (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                    Cobro pendiente
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className={STATUS_STYLES[settlement.status] ?? ""}>
                                    {legacy && settlement.status === SettlementStatus.PAID
                                      ? "Pagada (anterior)"
                                      : STATUS_LABELS[settlement.status] ?? settlement.status}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    title="Descargar comprobante PDF"
                                    disabled={downloadingReceiptId === settlement.id}
                                    onClick={() => downloadReceipt(settlement.id, settlement.cashierUsername)}
                                  >
                                    {downloadingReceiptId === settlement.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <Download className="h-3.5 w-3.5" />}
                                  </Button>
                                  {awaitingConfirmation && (
                                    <Button
                                      size="sm"
                                      onClick={() => setConfirmTarget({ settlement, username: settlement.cashierUsername ?? "" })}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                                      title="Confirmar que el cajero pagó"
                                    >
                                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                      Confirmar cobro
                                    </Button>
                                  )}
                                  {settlement.status !== SettlementStatus.CANCELED &&
                                    !(legacy && settlement.status === SettlementStatus.PAID) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openCancel(settlement)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Cancelar liquidación"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{settlementsRangeLabel}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={settlementsPage <= 1}
                      onClick={() => setSettlementsPage(page => Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {settlementsPagination?.page ?? 1} de {totalPagesSettlements}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={settlementsPage >= totalPagesSettlements}
                      onClick={() => setSettlementsPage(page => Math.min(totalPagesSettlements, page + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4">
            <OwnerAccount />
          </TabsContent>

          {isOwner && (
            <TabsContent value="admins" className="space-y-4">
              {tab === "admins" && <AdminChipPurchases />}
            </TabsContent>
          )}

          {role === UserRole.ADMIN && (
            <TabsContent value="purchases" className="space-y-4">
              {tab === "purchases" && <OwnChipPurchases />}
            </TabsContent>
          )}

          <TabsContent value="bets" className="space-y-4">
            {tab === "bets" && <BetsReport />}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(compensationAccount)} onOpenChange={open => !open && setCompensationAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comisión de {compensationAccount?.username}</DialogTitle>
            <DialogDescription>
              Porcentaje sobre la venta de fichas del cajero y si los premios se descuentan del subtotal. El cambio
              aplica desde ahora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="compensation-percentage">Porcentaje de comisión</Label>
            <div className="relative">
              <Input
                id="compensation-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={compensationPercentage}
                onChange={event => setCompensationPercentage(event.target.value)}
                placeholder="Ej: 20"
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ejemplo: con 20%, si el cajero vende $900 en fichas, se queda con $180 y te debe $720.
            </p>
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="compensation-prizes">Los premios afectan el subtotal</Label>
                <p className="text-xs text-muted-foreground">
                  {compensationPrizes
                    ? "El cajero paga los premios: subtotal = venta − comisión − premios."
                    : "Los premios los pagás vos: subtotal = venta − comisión."}
                </p>
              </div>
              <Switch
                id="compensation-prizes"
                checked={compensationPrizes}
                onCheckedChange={setCompensationPrizes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompensationAccount(null)}>Cancelar</Button>
            <Button onClick={saveCompensation} disabled={savingCompensation}>
              {savingCompensation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar comisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmCollectionDialog
        target={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirmed={onCollectionConfirmed}
      />

      <Dialog open={Boolean(cancelingSettlement)} onOpenChange={open => !open && setCancelingSettlement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar liquidación</DialogTitle>
            <DialogDescription>
              La liquidación de {cancelingSettlement?.cashierUsername} quedará anulada, se le devuelven las
              fichas que se le retiraron y el período podrá liquidarse nuevamente. Solo se puede cancelar la
              última liquidación de cada cajero.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={event => setCancelReason(event.target.value)}
              placeholder="Motivo de la cancelación"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelingSettlement(null)}>Volver</Button>
            <Button
              onClick={cancelSettlement}
              disabled={canceling}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {canceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar liquidación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailAccount)} onOpenChange={open => !open && setDetailAccount(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cuenta corriente de {detailAccount?.username}</DialogTitle>
            <DialogDescription>
              Entregas de fichas, ventas, premios, liquidaciones y cobros del cajero.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuenta...
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Fichas del cajero</div>
                  <div className="font-semibold text-blue-600">{formatChipsAmount(detail.account.chipBalance)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Sin liquidar</div>
                  <div className="font-semibold">{formatMoney(detail.account.openSubtotal)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    venta {formatMoney(detail.account.openSales)} · premios {formatMoney(detail.account.openPrizes)}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Deuda arrastrada</div>
                  <div className="font-semibold">{formatMoney(detail.account.debt)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">A cobrar</div>
                  <div className="font-semibold text-amber-700">{formatMoney(detail.account.balanceDue)}</div>
                  {detail.account.onAccountCollected !== 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      cobros a cuenta −{formatMoney(detail.account.onAccountCollected)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <h4 className="text-sm font-semibold">Movimientos</h4>
                  <div className="grid gap-3 text-[10px] uppercase text-muted-foreground" style={{ gridTemplateColumns: "6.5rem 6.5rem" }}>
                    <span className="text-right">Fichas</span>
                    <span className="text-right">Debe ($)</span>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-lg border">
                  {detail.movements.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Sin movimientos.</div>
                  ) : (
                    detail.movements.map(ledgerRow)
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Liquidaciones</h4>
                <div className="max-h-56 overflow-y-auto rounded-lg border">
                  {detail.settlements.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Sin liquidaciones.</div>
                  ) : (
                    detail.settlements.map(settlement => (
                      <div
                        key={settlement.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">
                            {formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Venta {formatMoney(settlement.totalSales)} · Premios {formatMoney(settlement.totalPrizesPaid)}
                            {!isLegacy(settlement) && (
                              <> · Subtotal {formatMoney(settlement.subtotal)} · Cobrado {formatMoney(settlement.collected)}</>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isLegacy(settlement) && (
                            <span className="font-semibold text-amber-700">
                              debe {formatMoney(settlement.debtCarried)}
                              {(settlement.pendingCollection ?? 0) > 0 && (
                                <> · pendiente {formatMoney(settlement.pendingCollection)}</>
                              )}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[settlement.status] ?? ""}
                          >
                            {STATUS_LABELS[settlement.status] ?? settlement.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No se pudo cargar la cuenta.</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAccount(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
