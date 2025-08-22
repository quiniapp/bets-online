"use client"

import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockTransactions, type User } from "@/lib/mock-data"
import { ArrowUp, ArrowDown, DollarSign, Settings } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function UserTransactions() {
  const { user, role } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    if (role !== "user") {
      router.push("/user/login")
    }
  }, [role, router])

  if (role !== "user" || !user) return null

  const currentUser = user as User
  const userTransactions = mockTransactions.filter((tx) => tx.userId === currentUser.id)

  const deposits = userTransactions.filter((tx) => tx.type === "deposit")
  const withdrawals = userTransactions.filter((tx) => tx.type === "withdrawal")
  const bets = userTransactions.filter((tx) => tx.type === "bet")
  const wins = userTransactions.filter((tx) => tx.type === "win")

  const totalDeposits = deposits.reduce((sum, tx) => sum + tx.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDown className="h-4 w-4 text-green-600" />
      case "withdrawal":
        return <ArrowUp className="h-4 w-4 text-red-600" />
      case "bet":
        return <DollarSign className="h-4 w-4 text-blue-600" />
      case "win":
        return <ArrowDown className="h-4 w-4 text-green-600" />
      case "adjustment":
        return <Settings className="h-4 w-4 text-purple-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return "text-green-600"
    if (amount < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "deposit":
        return t("transactions.deposit")
      case "withdrawal":
        return t("transactions.withdrawal")
      case "bet":
        return t("transactions.bet")
      case "win":
        return t("transactions.win")
      case "adjustment":
        return t("transactions.adjustment")
      default:
        return t("transactions.transaction")
    }
  }

  return (
    <DashboardLayout title={t("nav.transactions")}>
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
            <div className="text-2xl font-bold text-blue-600">{bets.length}</div>
            <p className="text-xs text-muted-foreground">
              ${Math.abs(bets.reduce((sum, tx) => sum + tx.amount, 0)).toFixed(2)} {t("transactions.wagered")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("transactions.winnings")}</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{wins.length}</div>
            <p className="text-xs text-muted-foreground">
              ${wins.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} {t("transactions.won")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.allTransactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {userTransactions.length > 0 ? (
            <div className="space-y-4">
              {userTransactions
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <h3 className="font-semibold">{getTransactionLabel(transaction.type)}</h3>
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.createdAt.toLocaleDateString()} • {transaction.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${getTransactionColor(transaction.type, transaction.amount)}`}
                      >
                        {transaction.amount > 0 ? "+" : ""}${transaction.amount.toFixed(2)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {getTransactionLabel(transaction.type)}
                      </Badge>
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
    </DashboardLayout>
  )
}
