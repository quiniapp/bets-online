"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import { LayoutDashboard, Gamepad2, User, Users, BarChart3, Settings, DollarSign, Wallet, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { ChipOperationDialog } from "@/components/admin/chip-operation-dialog"
import { useChips } from "@/hooks/useChips"

export function MobileBottomNav() {
  const pathname = usePathname()
  const { role } = useAuth()
  const [walletOpen, setWalletOpen] = useState(false)
  const { loadBalance } = useChips()

  const isAdminRole = role === UserRole.ADMIN || role === UserRole.OWNER || role === UserRole.CASHIER
  const hasWallet = role === UserRole.ADMIN || role === UserRole.CASHIER

  const playerItems = [
    { href: "/user/dashboard", icon: LayoutDashboard, label: "Inicio" },
    { href: "/user/games", icon: Gamepad2, label: "Juegos" },
    { href: "/user/profile", icon: User, label: "Perfil" },
  ]

  const dashboardHref = role === UserRole.CASHIER ? "/cashier/dashboard" : "/admin/dashboard"

  const adminItemsLeft = [
    { href: dashboardHref, icon: BarChart3, label: "Stats" },
    { href: "/admin/users", icon: Users, label: "Usuarios" },
  ]

  const adminItemsRight = role === UserRole.CASHIER
    ? [
        { href: "/admin/users/create-user", icon: UserPlus, label: "Registrar" },
        { href: "/admin/settings", icon: Settings, label: "Config" },
      ]
    : [
        { href: "/admin/games", icon: Gamepad2, label: "Juegos" },
        { href: "/admin/settings", icon: Settings, label: "Config" },
      ]

  const adminItemsNoWallet = [
    { href: "/admin/dashboard", icon: BarChart3, label: "Stats" },
    { href: "/admin/users", icon: Users, label: "Usuarios" },
    { href: "/admin/games", icon: Gamepad2, label: "Juegos" },
    { href: "/admin/balances", icon: Wallet, label: "Balances" },
    { href: "/admin/settings", icon: Settings, label: "Config" },
  ]

  const renderLink = (item: { href: string; icon: React.ElementType; label: string }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors select-none",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {isActive && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-b-full" />
        )}
        <item.icon
          className={cn("h-5 w-5 transition-all", isActive ? "stroke-[2.5]" : "stroke-[1.5]")}
        />
        <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16">
          {!isAdminRole && playerItems.map(renderLink)}

          {isAdminRole && hasWallet && (
            <>
              {adminItemsLeft.map(renderLink)}
              <button
                onClick={() => setWalletOpen(true)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 select-none"
                aria-label="Cargar Saldo"
              >
                <div className="w-12 h-12 -mt-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <DollarSign className="h-5 w-5 text-primary-foreground stroke-[2]" />
                </div>
                <span className="text-[10px] leading-none font-medium text-primary -mt-1">
                  Saldo
                </span>
              </button>
              {adminItemsRight.map(renderLink)}
            </>
          )}

          {isAdminRole && !hasWallet && adminItemsNoWallet.map(renderLink)}
        </div>
      </nav>

      {hasWallet && (
        <ChipOperationDialog
          operationType="sell"
          open={walletOpen}
          onOpenChange={setWalletOpen}
          onSuccess={loadBalance}
        />
      )}
    </>
  )
}
