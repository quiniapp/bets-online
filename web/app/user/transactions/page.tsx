"use client"

import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRole, ChipMovementType } from "helper"
import { ArrowUp, ArrowDown, DollarSign, Settings, Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useTransactions } from "@/hooks/useTransactions"

export default function UserTransactions() {
  const { user, role } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { transactions, loading, loadTransactions } = useTransactions()

  useEffect(() => {
    if (role !== UserRole.PLAYER) {
      router.push("/user/login")
    }
  }, [role, router])

  useEffect(() => {
    if (user && role === UserRole.PLAYER) {
      loadTransactions({ limit: 100 })
    }
  }, [user, role])

  if (role !== UserRole.PLAYER || !user) return null

  // Filter and categorize transactions
  const deposits = transactions.filter(
    (tx) =>
      tx.type === ChipMovementType.DEPOSIT ||
      tx.type === ChipMovementType.SELL_TO_PLAYER ||
      tx.type === ChipMovementType.BUY_FROM_ADMIN
  )
  const withdrawals = transactions.filter((tx) => tx.type === ChipMovementType.WITHDRAWAL)
  const losses = transactions.filter((tx) => tx.type === ChipMovementType.LOSS)
  const prizes = transactions.filter((tx) => tx.type === ChipMovementType.PRIZE)

  const totalDeposits = deposits.reduce((sum, tx) => sum + tx.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amount, 0)
  const totalLosses = losses.reduce((sum, tx) => sum + tx.amount, 0)
  const totalPrizes = prizes.reduce((sum, tx) => sum + tx.amount, 0)

  const getTransactionIcon = (type: ChipMovementType) => {
    switch (type) {
      case ChipMovementType.DEPOSIT:
      case ChipMovementType.SELL_TO_PLAYER:
      case ChipMovementType.BUY_FROM_ADMIN:
      case ChipMovementType.PRIZE:
        return <ArrowDown className="h-4 w-4 text-green-600" />
      case ChipMovementType.WITHDRAWAL:
      case ChipMovementType.LOSS:
        return <ArrowUp className="h-4 w-4 text-red-600" />
      case ChipMovementType.ADJUSTMENT:
      case ChipMovementType.RECOVERY:
        return <Settings className="h-4 w-4 text-purple-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionColor = (amount: number) => {
    if (amount > 0) return "text-green-600"
    if (amount < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getTransactionLabel = (type: ChipMovementType) => {
    switch (type) {
      case ChipMovementType.DEPOSIT:
        return t("transactions.deposit")
      case ChipMovementType.WITHDRAWAL:
        return t("transactions.withdrawal")
      case ChipMovementType.LOSS:
        return t("transactions.bet")
      case ChipMovementType.PRIZE:
        return t("transactions.win")
      case ChipMovementType.SELL_TO_PLAYER:
      case ChipMovementType.BUY_FROM_ADMIN:
        return "Compra de Fichas"
      case ChipMovementType.ADJUSTMENT:
        return t("transactions.adjustment")
      case ChipMovementType.RECOVERY:
        return "Recuperación"
      default:
        return t("transactions.transaction")
    }
  }

  return (
    <DashboardLayout title={t("nav.transactions")}>
      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("transactions.totalDeposits")}</CardTitle>
                <ArrowDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${totalDeposits.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {deposits.length} {t("transactions.transactions")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("transactions.totalWithdrawals")}</CardTitle>
                <ArrowUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">${totalWithdrawals.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {withdrawals.length} {t("transactions.transactions")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("transactions.bets")}</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{losses.length}</div>
                <p className="text-xs text-muted-foreground">
                  ${totalLosses.toFixed(2)} {t("transactions.wagered")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("transactions.winnings")}</CardTitle>
                <ArrowDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{prizes.length}</div>
                <p className="text-xs text-muted-foreground">
                  ${totalPrizes.toFixed(2)} {t("transactions.won")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("transactions.allTransactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <h3 className="font-semibold">{getTransactionLabel(transaction.type)}</h3>
                            <p className="text-sm text-gray-600">{transaction.description || "-"}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()} •{" "}
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-semibold ${getTransactionColor(transaction.amount)}`}>
                            {transaction.amount > 0 ? "+" : ""}${transaction.amount.toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: ${transaction.newBalance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("transactions.noTransactions")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  )
}
