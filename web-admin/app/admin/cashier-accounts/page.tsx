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
import { useDebounce } from "@/hooks/useDebounce"
import { useCashierAccounts, useCashierSettlements } from "@/hooks/useCashierAccounts"
import {
  currentWeekRange,
  endOfDayIso,
  startOfDayIso,
  toDateInput
} from "@/hooks/useCashierPeriodAccounts"
import { CashierPeriodAccounts } from "@/components/admin/cashier-period-accounts"
import { OwnerAccount } from "@/components/admin/owner-account"
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import {
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Eye,
  HandCoins,
  Loader2,
  Percent,
  Search,
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
  CashierAccountSummary,
  CashierLedgerKind,
  CashierSettlement,
  CashierSettlementPreview,
  CashierSettlementWithCashier
} from "helper"

const ITEMS_PER_PAGE = 20

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

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounce(searchTerm, 350)
  const [accountsPage, setAccountsPage] = useState(1)
  const [settlementsPage, setSettlementsPage] = useState(1)
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>("ALL")

  const {
    accounts,
    summary,
    loading: accountsLoading,
    error: accountsError,
    pagination: accountsPagination,
    reload: reloadAccounts
  } = useCashierAccounts({
    page: accountsPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch.trim() || undefined
  })

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
    setAccountsPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    setSettlementsPage(1)
  }, [settlementStatusFilter])

  useEffect(() => {
    if (!authLoading && role !== UserRole.OWNER) {
      router.replace("/admin/dashboard")
    }
  }, [authLoading, role, router])

  const [compensationAccount, setCompensationAccount] = useState<CashierAccountSummary | null>(null)
  const [compensationPercentage, setCompensationPercentage] = useState("")
  const [savingCompensation, setSavingCompensation] = useState(false)

  const [settlementAccount, setSettlementAccount] = useState<CashierAccountSummary | null>(null)
  const [settlementStart, setSettlementStart] = useState("")
  const [settlementEnd, setSettlementEnd] = useState("")
  const [settlementNotes, setSettlementNotes] = useState("")
  const [settlementCollected, setSettlementCollected] = useState("")
  const [settlementChipsLeft, setSettlementChipsLeft] = useState("")
  const [preview, setPreview] = useState<CashierSettlementPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creatingSettlement, setCreatingSettlement] = useState(false)

  const [collectingSettlement, setCollectingSettlement] = useState<CashierSettlementWithCashier | null>(null)
  const [collectAmount, setCollectAmount] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [collecting, setCollecting] = useState(false)

  const [cancelingSettlement, setCancelingSettlement] = useState<CashierSettlementWithCashier | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [canceling, setCanceling] = useState(false)

  const [detailAccount, setDetailAccount] = useState<CashierAccountSummary | null>(null)
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

  const openCompensation = (account: CashierAccountSummary) => {
    setCompensationAccount(account)
    setCompensationPercentage(
      account.compensation?.percentage !== null && account.compensation?.percentage !== undefined
        ? String(account.compensation.percentage)
        : ""
    )
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
        { type: CompensationType.PERCENTAGE, percentage }
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

  const openSettlement = (account: CashierAccountSummary) => {
    // Por defecto: desde el día siguiente a la última liquidación (o la semana
    // en curso si nunca se liquidó) hasta hoy.
    const week = currentWeekRange()
    let start = week.from
    if (account.lastSettlementEnd) {
      const next = new Date(new Date(account.lastSettlementEnd).getTime() + 1)
      start = toDateInput(next)
    }

    setSettlementAccount(account)
    setSettlementStart(start)
    setSettlementEnd(week.to)
    setSettlementNotes("")
    setSettlementCollected("")
    setSettlementChipsLeft("")
    setPreview(null)
  }

  useEffect(() => {
    if (!settlementAccount || !settlementStart || !settlementEnd) return
    if (settlementStart > settlementEnd) {
      setPreview(null)
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const query = new URLSearchParams({
          periodStart: startOfDayIso(settlementStart),
          periodEnd: endOfDayIso(settlementEnd)
        })
        const response = await apiService.get<CashierSettlementPreview>(
          `/cashier-accounts/${settlementAccount.cashierId}/preview?${query.toString()}`
        )
        if (cancelled) return
        if (response.success && response.data) {
          setPreview(response.data)
          setSettlementCollected(String(Math.max(response.data.totalDue, 0)))
          setSettlementChipsLeft(String(response.data.unsoldChips))
        } else {
          setPreview(null)
          toast({
            variant: "destructive",
            title: "No se pudo calcular el período",
            description: response.error?.message || "Error desconocido"
          })
        }
      } catch (error) {
        if (!cancelled) {
          setPreview(null)
          toast({
            variant: "destructive",
            title: "No se pudo calcular el período",
            description: error instanceof Error ? error.message : "Error de conexión"
          })
        }
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // toast es un helper sin identidad estable: no debe re-disparar el preview.
  }, [settlementAccount, settlementStart, settlementEnd])

  const collectedValue = parseNumber(settlementCollected)
  const chipsLeftValue = parseNumber(settlementChipsLeft)
  const settlementInputError = (() => {
    if (!preview) return null
    if (!Number.isFinite(collectedValue) || collectedValue < 0) return "Cobro inválido"
    if (!Number.isFinite(chipsLeftValue) || chipsLeftValue < 0) return "Deje inválido"
    if (chipsLeftValue > preview.unsoldChips) {
      return `El deje no puede superar las ${formatChipsAmount(preview.unsoldChips)} fichas no vendidas`
    }
    return null
  })()

  const createSettlement = async () => {
    if (!settlementAccount || creatingSettlement || !preview || settlementInputError) return
    const cashierUsername = settlementAccount.username
    setCreatingSettlement(true)
    try {
      const response = await apiService.post<{
        settlement: CashierSettlement
        message: string
      }>(
        `/cashier-accounts/${settlementAccount.cashierId}/settlements`,
        {
          periodStart: startOfDayIso(settlementStart),
          periodEnd: endOfDayIso(settlementEnd),
          collected: collectedValue,
          chipsLeft: chipsLeftValue,
          notes: settlementNotes.trim() || undefined
        }
      )

      if (response.success && response.data) {
        toast({ title: "Liquidación creada" })
        setSettlementAccount(null)
        setPreview(null)
        await refreshAll()
        setPeriodRefreshKey(key => key + 1)
        await downloadReceipt(response.data.settlement.id, cashierUsername)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo crear la liquidación",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la liquidación",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setCreatingSettlement(false)
    }
  }

  const openCollect = (settlement: CashierSettlementWithCashier) => {
    setCollectingSettlement(settlement)
    setCollectAmount(String(Math.max(settlement.debtCarried ?? 0, 0)))
    setPaymentReference("")
  }

  const collectSettlement = async () => {
    if (!collectingSettlement || collecting) return
    const amount = parseNumber(collectAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Monto inválido" })
      return
    }
    setCollecting(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/settlements/${collectingSettlement.id}/collect`,
        { amount, paymentReference: paymentReference.trim() || undefined }
      )
      if (response.success) {
        toast({ title: "Cobro registrado" })
        setCollectingSettlement(null)
        await refreshAll()
        setPeriodRefreshKey(key => key + 1)
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo registrar el cobro",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el cobro",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setCollecting(false)
    }
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

  const openDetail = async (account: CashierAccountSummary) => {
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

  const totalPagesAccounts = accountsPagination?.totalPages ?? 1
  const totalPagesSettlements = settlementsPagination?.totalPages ?? 1

  const accountsRangeLabel = useMemo(() => {
    if (!accountsPagination || accountsPagination.total === 0) return "Sin cajeros"
    const from = (accountsPagination.page - 1) * accountsPagination.limit + 1
    const to = Math.min(accountsPagination.page * accountsPagination.limit, accountsPagination.total)
    return `${from}-${to} de ${accountsPagination.total}`
  }, [accountsPagination])

  const settlementsRangeLabel = useMemo(() => {
    if (!settlementsPagination || settlementsPagination.total === 0) return "Sin liquidaciones"
    const from = (settlementsPagination.page - 1) * settlementsPagination.limit + 1
    const to = Math.min(settlementsPagination.page * settlementsPagination.limit, settlementsPagination.total)
    return `${from}-${to} de ${settlementsPagination.total}`
  }, [settlementsPagination])

  if (!authLoading && role !== UserRole.OWNER) {
    return null
  }

  const previewDebt = preview && Number.isFinite(collectedValue)
    ? preview.totalDue - collectedValue
    : 0
  const previewUnsoldRecovered = preview && Number.isFinite(chipsLeftValue)
    ? Math.max(preview.unsoldChips - chipsLeftValue, 0)
    : 0

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
    <DashboardLayout title="Cuentas corrientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cuentas corrientes con cajeros</h2>
            <p className="text-sm text-muted-foreground">
              Fichas entregadas, venta de fichas, premios, comisiones, cobros y liquidaciones con cada cajero.
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
              <p className="text-xs text-muted-foreground">{summary.totalCashiers} cajeros en tu árbol</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="period" className="space-y-4">
          <TabsList>
            <TabsTrigger value="period">Cuenta corriente</TabsTrigger>
            <TabsTrigger value="accounts">Cuentas de cajeros</TabsTrigger>
            <TabsTrigger value="settlements">Liquidaciones</TabsTrigger>
            <TabsTrigger value="owner">Cuenta del owner</TabsTrigger>
          </TabsList>

          <TabsContent value="period" className="space-y-4">
            <CashierPeriodAccounts key={periodRefreshKey} onChanged={refreshAll} />
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="Buscar cajero por usuario, nombre o email..."
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {accountsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas...
                  </div>
                ) : accountsError ? (
                  <div className="py-16 text-center text-sm text-red-600">{accountsError}</div>
                ) : accounts.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    No hay cajeros que coincidan con la búsqueda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[1050px]">
                      <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="col-span-3">Cajero</div>
                        <div className="col-span-1">Comisión</div>
                        <div className="col-span-2">Sin liquidar</div>
                        <div className="col-span-2">Deuda arrastrada</div>
                        <div className="col-span-2">A cobrar</div>
                        <div className="col-span-2 text-right">Acciones</div>
                      </div>
                      {accounts.map(account => (
                        <div
                          key={account.cashierId}
                          className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/20"
                        >
                          <div className="col-span-3 min-w-0">
                            <button
                              onClick={() => openDetail(account)}
                              className="truncate text-left font-semibold text-blue-600 hover:underline"
                            >
                              {account.username}
                            </button>
                            <div className="truncate text-xs text-muted-foreground">
                              {[account.firstName, account.lastName].filter(Boolean).join(" ") || account.email || "Sin datos"}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px]">
                                {account.status === "ACTIVE" ? "Activo" : "Bloqueado"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {formatChipsAmount(account.chipBalance)} fichas
                                {account.lastSettlementEnd && ` · liquidado hasta ${formatDate(account.lastSettlementEnd)}`}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-1">
                            {account.compensation ? (
                              <div className="font-semibold">{account.compensation.percentage ?? 0}%</div>
                            ) : (
                              <Badge variant="outline" className="border-amber-200 text-amber-700">
                                Sin configurar
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2 text-xs">
                            <div>venta <span className="font-medium text-emerald-600">{formatMoney(account.openSales)}</span></div>
                            <div className="text-muted-foreground">
                              premios {formatMoney(account.openPrizes)} · subtotal {formatMoney(account.openSubtotal)}
                            </div>
                          </div>
                          <div className="col-span-2 font-semibold tabular-nums">
                            {formatMoney(account.debt)}
                          </div>
                          <div className="col-span-2">
                            <div className="font-semibold text-amber-700">{formatMoney(account.balanceDue)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              cobrado histórico {formatMoney(account.totalCollected)}
                            </div>
                          </div>
                          <div className="col-span-2 flex flex-wrap justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCompensation(account)}
                              title="Configurar comisión"
                            >
                              <Percent className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSettlement(account)}
                              title="Liquidar"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetail(account)}
                              title="Ver cuenta corriente"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{accountsRangeLabel}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={accountsPage <= 1}
                      onClick={() => setAccountsPage(page => Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {accountsPagination?.page ?? 1} de {totalPagesAccounts}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={accountsPage >= totalPagesAccounts}
                      onClick={() => setAccountsPage(page => Math.min(totalPagesAccounts, page + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    <table className="w-full min-w-[1150px] text-sm">
                      <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Cajero</th>
                          <th className="px-3 py-3 text-left font-semibold">Período</th>
                          <th className="px-3 py-3 text-right font-semibold">Venta</th>
                          <th className="px-3 py-3 text-right font-semibold">Premios</th>
                          <th className="px-3 py-3 text-right font-semibold">Comisión</th>
                          <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
                          <th className="px-3 py-3 text-right font-semibold">Cobrado</th>
                          <th className="px-3 py-3 text-right font-semibold">Arrastre</th>
                          <th className="px-3 py-3 text-center font-semibold">Estado</th>
                          <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {settlements.map(settlement => {
                          const legacy = isLegacy(settlement)
                          const commission = settlement.commission ?? settlement.payableAmount
                          const canCollect =
                            !legacy &&
                            settlement.status !== SettlementStatus.CANCELED &&
                            (settlement.debtCarried ?? 0) > 0
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
                              <td className={`px-3 py-3 text-right font-semibold tabular-nums ${(settlement.debtCarried ?? 0) > 0 ? "text-amber-700" : ""}`}>
                                {legacy ? "—" : formatMoney(settlement.debtCarried)}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge variant="outline" className={STATUS_STYLES[settlement.status] ?? ""}>
                                  {legacy && settlement.status === SettlementStatus.PAID
                                    ? "Pagada (anterior)"
                                    : STATUS_LABELS[settlement.status] ?? settlement.status}
                                </Badge>
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
                                  {canCollect && (
                                    <Button
                                      size="sm"
                                      onClick={() => openCollect(settlement)}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                      <HandCoins className="mr-1 h-3.5 w-3.5" />
                                      Cobrar
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
        </Tabs>
      </div>

      <Dialog open={Boolean(compensationAccount)} onOpenChange={open => !open && setCompensationAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comisión de {compensationAccount?.username}</DialogTitle>
            <DialogDescription>
              Porcentaje sobre la venta de fichas del cajero. El cambio aplica desde ahora.
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

      <Dialog open={Boolean(settlementAccount)} onOpenChange={open => !open && setSettlementAccount(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Liquidar a {settlementAccount?.username}</DialogTitle>
            <DialogDescription>
              Se cobra la venta de fichas menos la comisión, se retiran las fichas de premios y
              se decide cuántas fichas no vendidas le quedan al cajero.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settlement-start">Desde</Label>
              <Input
                id="settlement-start"
                type="date"
                value={settlementStart}
                onChange={event => setSettlementStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-end">Hasta</Label>
              <Input
                id="settlement-end"
                type="date"
                value={settlementEnd}
                onChange={event => setSettlementEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            {previewLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando período...
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {preview.unsettledSince && (
                  <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Hay movimientos sin liquidar desde el {formatDate(preview.unsettledSince, true)}. Revisá la fecha de inicio.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Venta de fichas</div>
                    <div className="font-semibold text-emerald-600">{formatMoney(preview.totalSales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Comisión ({preview.compensation?.percentage ?? 0}%)
                    </div>
                    <div className="font-semibold">{formatMoney(preview.commission)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Subtotal</div>
                    <div className="font-semibold">{formatMoney(preview.subtotal)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Saldo anterior</div>
                    <div className="font-semibold">{formatMoney(preview.previousDebt)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Total a cobrar</span>
                  <span className="text-lg font-bold text-amber-700">{formatMoney(preview.totalDue)}</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="settlement-collected">Cobro</Label>
                    <Input
                      id="settlement-collected"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settlementCollected}
                      onChange={event => setSettlementCollected(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Arrastre a la próxima liquidación: <span className="font-semibold">{formatMoney(previewDebt)}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="settlement-chips-left">Deje (fichas no vendidas que se queda)</Label>
                    <Input
                      id="settlement-chips-left"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settlementChipsLeft}
                      onChange={event => setSettlementChipsLeft(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tiene {formatChipsAmount(preview.chipBalance)} fichas: {formatChipsAmount(preview.prizeChipsToRecover)} de premios
                      (se retiran) y {formatChipsAmount(preview.unsoldChips)} no vendidas
                      {previewUnsoldRecovered > 0 && ` · se retiran ${formatChipsAmount(previewUnsoldRecovered)}`}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Entregadas en el período: {formatChipsAmount(preview.chipsDelivered)} · premios{" "}
                  {formatMoney(preview.totalPrizes)} (los pagás vos al jugador).
                </p>
                {!preview.compensation && (
                  <p className="text-xs text-amber-700">
                    El cajero no tiene comisión configurada: configurala antes de liquidar.
                  </p>
                )}
                {settlementInputError && (
                  <p className="text-xs text-red-600">{settlementInputError}</p>
                )}
              </div>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                Elegí un rango de fechas para calcular la liquidación.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-notes">Notas (opcional)</Label>
            <Input
              id="settlement-notes"
              value={settlementNotes}
              onChange={event => setSettlementNotes(event.target.value)}
              placeholder="Observaciones de la liquidación"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlementAccount(null)}>Cancelar</Button>
            <Button
              onClick={createSettlement}
              disabled={
                creatingSettlement ||
                previewLoading ||
                !preview ||
                !preview.compensation ||
                Boolean(settlementInputError)
              }
            >
              {creatingSettlement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Liquidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(collectingSettlement)} onOpenChange={open => !open && setCollectingSettlement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogDescription>
              Cobro a {collectingSettlement?.cashierUsername} sobre la liquidación del{" "}
              {formatDate(collectingSettlement?.periodStart)} al {formatDate(collectingSettlement?.periodEnd)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Debe</div>
              <div className="text-2xl font-bold text-amber-700">
                {formatMoney(collectingSettlement?.debtCarried ?? 0)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collect-amount">Monto cobrado</Label>
              <Input
                id="collect-amount"
                type="number"
                min="0"
                step="0.01"
                value={collectAmount}
                onChange={event => setCollectAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Referencia (opcional)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={event => setPaymentReference(event.target.value)}
                placeholder="Efectivo, transferencia, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectingSettlement(null)}>Cancelar</Button>
            <Button
              onClick={collectSettlement}
              disabled={collecting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {collecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                              arrastre {formatMoney(settlement.debtCarried)}
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
