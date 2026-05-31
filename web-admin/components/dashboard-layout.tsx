"use client"

import type React from "react"
import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { LogOut } from "lucide-react"
import { UserRole } from "helper"
import { useChips } from "@/hooks/useChips"
import { formatChips } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, role, logout } = useAuth()
  const showBalance = role === UserRole.ADMIN || role === UserRole.CASHIER
  const { balance, loadBalance } = useChips()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    if (showBalance) loadBalance()
  }, [showBalance, user?.id])

  const getRoleDisplay = () => {
    switch (role) {
      case UserRole.OWNER: return "owner"
      case UserRole.ADMIN: return "admin"
      case UserRole.CASHIER: return "cajero"
      case UserRole.PLAYER: return "jugador"
      default: return "usuario"
    }
  }

  const isAdminRole = role === UserRole.ADMIN || role === UserRole.OWNER || role === UserRole.CASHIER

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-10 md:h-13 items-center justify-between border-b bg-background px-3 md:px-6 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isAdminRole && <MobileSidebar />}
            {title && (
              <h1 className="text-xs md:text-lg font-semibold truncate">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">{user?.username}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{getRoleDisplay()}</span>
              {showBalance && balance && (
                <span className="font-semibold text-green-600">${formatChips(balance.chipBalance)}</span>
              )}
            </div>
            <div className="sm:hidden flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">{user?.username}</span>
              {showBalance && balance && (
                <span className="text-[10px] font-semibold text-green-600">${formatChips(balance.chipBalance)}</span>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold h-7 px-2 md:h-8 md:px-3 text-xs"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>

        <footer className="hidden md:block border-t bg-muted/50 px-4 md:px-6 py-2 shrink-0">
          <div className="text-center text-xs text-muted-foreground">
            © 2025 BetPlatform. Todos los derechos reservados.
          </div>
        </footer>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará tu sesión actual y serás redirigido al inicio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
            >
              Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
