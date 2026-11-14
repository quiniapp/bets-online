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
import { apiService } from "@/services/api.service"
import { formatChips } from "@/lib/utils"
import {
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Percent,
  Search,
  TrendingUp,
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
  CashierAccountSummary,
  CashierSettlementPreview,
  CashierSettlementWithCashier
} from "helper"

const ITEMS_PER_PAGE = 20

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  CANCELED: "Cancelada",
  PARTIALLY_PAID: "Pago parcial"
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELED: "bg-slate-100 text-slate-700 border-slate-200",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800 border-blue-200"
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

const formatMoney = (value: number) => `$${formatChips(Number(value) || 0)}`

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const startOfDayIso = (value: string) => new Date(`${value}T00:00:00`).toISOString()
const endOfDayIso = (value: string) => new Date(`${value}T23:59:59.999`).toISOString()

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
  const [preview, setPreview] = useState<CashierSettlementPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creatingSettlement, setCreatingSettlement] = useState(false)

  const [payingSettlement, setPayingSettlement] = useState<CashierSettlementWithCashier | null>(null)
  const [paymentReference, setPaymentReference] = useState("")
  const [paying, setPaying] = useState(false)

  const [cancelingSettlement, setCancelingSettlement] = useState<CashierSettlementWithCashier | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [canceling, setCanceling] = useState(false)

  const [detailAccount, setDetailAccount] = useState<CashierAccountSummary | null>(null)
  const [detail, setDetail] = useState<CashierAccountDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const refreshAll = useCallback(async () => {
    await Promise.all([reloadAccounts(), reloadSettlements()])
  }, [reloadAccounts, reloadSettlements])

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
    const percentage = Number(compensationPercentage.replace(",", "."))
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
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)

    setSettlementAccount(account)
    setSettlementStart(toDateInput(start))
    setSettlementEnd(toDateInput(end))
    setSettlementNotes("")
    setPreview(null)
  }

  useEffect(() => {
    if (!settlementAccount || !settlementStart || !settlementEnd) return
    if (new Date(settlementStart) >= new Date(settlementEnd)) {
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

  const createSettlement = async () => {
    if (!settlementAccount || creatingSettlement || !preview) return
    setCreatingSettlement(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/${settlementAccount.cashierId}/settlements`,
        {
          periodStart: startOfDayIso(settlementStart),
          periodEnd: endOfDayIso(settlementEnd),
          notes: settlementNotes.trim() || undefined
        }
      )

      if (response.success) {
        toast({ title: "Liquidación creada" })
        setSettlementAccount(null)
        setPreview(null)
        await refreshAll()
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

  const openPay = (settlement: CashierSettlementWithCashier) => {
    setPayingSettlement(settlement)
    setPaymentReference("")
  }

  const paySettlement = async () => {
    if (!payingSettlement || paying) return
    setPaying(true)
    try {
      const response = await apiService.post(
        `/cashier-accounts/settlements/${payingSettlement.id}/pay`,
        { paymentReference: paymentReference.trim() || undefined }
      )
      if (response.success) {
        toast({ title: "Comisión pagada" })
        setPayingSettlement(null)
        await refreshAll()
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo registrar el pago",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el pago",
        description: error instanceof Error ? error.message : "Error de conexión"
      })
    } finally {
      setPaying(false)
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
          title: "No se pudo cargar el detalle",
          description: response.error?.message || "Error desconocido"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cargar el detalle",
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

  const hasPreviewMovements = Boolean(
    preview && (preview.totalSales !== 0 || preview.totalPrizes !== 0)
  )

  return (
    <DashboardLayout title="Cuentas corrientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cuentas corrientes con cajeros</h2>
            <p className="text-sm text-muted-foreground">
              Ventas, premios, comisiones acumuladas y liquidaciones del propietario con cada cajero.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuentas de cajeros</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCashiers}</div>
              <p className="text-xs text-muted-foreground">cajeros en tu árbol</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia acumulada</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatMoney(summary.totalProfit)}</div>
              <p className="text-xs text-muted-foreground">
                ventas {formatMoney(summary.totalSales)} · premios {formatMoney(summary.totalPrizes)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones por pagar</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatMoney(summary.balanceDue)}</div>
              <p className="text-xs text-muted-foreground">
                {formatMoney(summary.pendingAmount)} en liquidaciones · {formatMoney(summary.openCommission)} por liquidar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones pagadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatMoney(summary.paidAmount)}</div>
              <p className="text-xs text-muted-foreground">histórico liquidado</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts">Cuentas de cajeros</TabsTrigger>
            <TabsTrigger value="settlements">Liquidaciones</TabsTrigger>
          </TabsList>

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
                        <div className="col-span-2">Comisión</div>
                        <div className="col-span-2">Ventas / premios</div>
                        <div className="col-span-1">Ganancia</div>
                        <div className="col-span-2">Saldo a favor</div>
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
                                fichas {formatMoney(account.chipBalance)}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            {account.compensation ? (
                              <div>
                                <div className="font-semibold">{account.compensation.percentage ?? 0}%</div>
                                <div className="text-xs text-muted-foreground">
                                  desde {formatDate(account.compensation.activeFrom)}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="border-amber-200 text-amber-700">
                                Sin configurar
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2 text-xs">
                            <div className="font-medium text-emerald-600">{formatMoney(account.totalSales)}</div>
                            <div className="text-muted-foreground">− {formatMoney(account.totalPrizes)}</div>
                          </div>
                          <div className="col-span-1 font-semibold tabular-nums">
                            {formatMoney(account.profit)}
                          </div>
                          <div className="col-span-2">
                            <div className="font-semibold text-amber-700">{formatMoney(account.balanceDue)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatMoney(account.pendingAmount)} liquidado · {formatMoney(account.openCommission)} abierto
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
                              title="Crear liquidación"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetail(account)}
                              title="Ver cuenta"
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
                      <SelectItem value={SettlementStatus.PENDING}>Pendientes</SelectItem>
                      <SelectItem value={SettlementStatus.PAID}>Pagadas</SelectItem>
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
                    <div className="min-w-[1050px]">
                      <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="col-span-2">Cajero</div>
                        <div className="col-span-2">Período</div>
                        <div className="col-span-1">Ventas</div>
                        <div className="col-span-1">Premios</div>
                        <div className="col-span-1">Ganancia</div>
                        <div className="col-span-1">Comisión</div>
                        <div className="col-span-1">Estado</div>
                        <div className="col-span-3 text-right">Acciones</div>
                      </div>
                      {settlements.map(settlement => (
                        <div
                          key={settlement.id}
                          className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/20"
                        >
                          <div className="col-span-2 font-medium">{settlement.cashierUsername}</div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}
                          </div>
                          <div className="col-span-1">{formatMoney(settlement.totalSales)}</div>
                          <div className="col-span-1">{formatMoney(settlement.totalPrizesPaid)}</div>
                          <div className="col-span-1">{formatMoney(settlement.profit)}</div>
                          <div className="col-span-1 font-semibold text-amber-700">
                            {formatMoney(settlement.payableAmount)}
                            {settlement.percentage !== null && settlement.percentage !== undefined && (
                              <div className="text-[10px] font-normal text-muted-foreground">
                                {settlement.percentage}%
                              </div>
                            )}
                          </div>
                          <div className="col-span-1">
                            <Badge
                              variant="outline"
                              className={STATUS_STYLES[settlement.status] ?? ""}
                            >
                              {STATUS_LABELS[settlement.status] ?? settlement.status}
                            </Badge>
                          </div>
                          <div className="col-span-3 flex flex-wrap justify-end gap-1">
                            {settlement.status === SettlementStatus.PENDING && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openPay(settlement)}
                                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Pagar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCancel(settlement)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {settlement.status === SettlementStatus.PAID && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(settlement.paidAt, true)}
                                {settlement.paymentReference ? ` · ${settlement.paymentReference}` : ""}
                              </span>
                            )}
                            {settlement.status === SettlementStatus.CANCELED && (
                              <span className="text-xs text-muted-foreground">Anulada</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
        </Tabs>
      </div>

      <Dialog open={Boolean(compensationAccount)} onOpenChange={open => !open && setCompensationAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comisión de {compensationAccount?.username}</DialogTitle>
            <DialogDescription>
              Porcentaje sobre la ganancia (ventas menos premios) del cajero. El cambio aplica desde ahora.
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
                placeholder="Ej: 25"
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Si la ganancia del período es negativa, la comisión se liquida en cero.
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
            <DialogTitle>Nueva liquidación de {settlementAccount?.username}</DialogTitle>
            <DialogDescription>
              Se calculan ventas y premios del período y se genera la comisión según el porcentaje vigente.
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

          <div className="space-y-2">
            <Label htmlFor="settlement-notes">Notas (opcional)</Label>
            <Input
              id="settlement-notes"
              value={settlementNotes}
              onChange={event => setSettlementNotes(event.target.value)}
              placeholder="Observaciones de la liquidación"
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            {previewLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando período...
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Comisión aplicada</span>
                  <span className="font-semibold">
                    {preview.compensation?.percentage ?? 0}%
                    {!preview.compensation && (
                      <span className="ml-2 text-xs font-normal text-amber-700">sin configurar</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Ventas</div>
                    <div className="font-semibold text-emerald-600">{formatMoney(preview.totalSales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Premios</div>
                    <div className="font-semibold text-red-600">{formatMoney(preview.totalPrizes)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Ganancia</div>
                    <div className="font-semibold">{formatMoney(preview.profit)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Comisión a pagar</div>
                    <div className="text-lg font-bold text-amber-700">{formatMoney(preview.payableAmount)}</div>
                  </div>
                </div>
                {!hasPreviewMovements && (
                  <p className="text-xs text-muted-foreground">
                    No hay movimientos de ventas ni premios en el período seleccionado.
                  </p>
                )}
              </div>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                Elegí un rango de fechas para calcular la liquidación.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlementAccount(null)}>Cancelar</Button>
            <Button
              onClick={createSettlement}
              disabled={
                creatingSettlement ||
                previewLoading ||
                !preview ||
                !hasPreviewMovements ||
                !preview.compensation
              }
            >
              {creatingSettlement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear liquidación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payingSettlement)} onOpenChange={open => !open && setPayingSettlement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar comisión</DialogTitle>
            <DialogDescription>
              Se registrará el pago de la liquidación de {payingSettlement?.cashierUsername}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Importe a pagar</div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatMoney(payingSettlement?.payableAmount ?? 0)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDate(payingSettlement?.periodStart)} → {formatDate(payingSettlement?.periodEnd)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Referencia del pago (opcional)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={event => setPaymentReference(event.target.value)}
                placeholder="Transferencia, comprobante, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingSettlement(null)}>Cancelar</Button>
            <Button
              onClick={paySettlement}
              disabled={paying}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelingSettlement)} onOpenChange={open => !open && setCancelingSettlement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar liquidación</DialogTitle>
            <DialogDescription>
              La liquidación de {cancelingSettlement?.cashierUsername} quedará anulada y el período podrá liquidarse nuevamente.
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
              Resumen, movimientos recientes y liquidaciones del cajero.
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
                  <div className="text-xs text-muted-foreground">Ventas</div>
                  <div className="font-semibold text-emerald-600">{formatMoney(detail.account.totalSales)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Premios</div>
                  <div className="font-semibold text-red-600">{formatMoney(detail.account.totalPrizes)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Ganancia</div>
                  <div className="font-semibold">{formatMoney(detail.account.profit)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Saldo a favor</div>
                  <div className="font-semibold text-amber-700">{formatMoney(detail.account.balanceDue)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatMoney(detail.account.pendingAmount)} liquidado · {formatMoney(detail.account.openCommission)} abierto
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Movimientos recientes</h4>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  {detail.movements.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Sin movimientos.</div>
                  ) : (
                    detail.movements.map(movement => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">
                            {movement.type === "SELL_TO_PLAYER" ? "Venta de fichas" : "Pago de premio"}
                            {movement.playerUsername ? ` · ${movement.playerUsername}` : ""}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {formatDate(movement.createdAt, true)}
                            {movement.description ? ` · ${movement.description}` : ""}
                          </div>
                        </div>
                        <div className={movement.type === "SELL_TO_PLAYER" ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                          {movement.type === "SELL_TO_PLAYER" ? "+" : "−"}
                          {formatMoney(Math.abs(movement.amount))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Liquidaciones</h4>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
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
                            Ventas {formatMoney(settlement.totalSales)} · Premios {formatMoney(settlement.totalPrizesPaid)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-700">{formatMoney(settlement.payableAmount)}</span>
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
