"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { UserRole } from "helper"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, role, logout } = useAuth()

  const getRoleDisplay = () => {
    switch (role) {
      case UserRole.OWNER:
        return "Propietario"
      case UserRole.ADMIN:
        return "Administrador"
      case UserRole.CASHIER:
        return "Cajero"
      case UserRole.PLAYER:
        return "Usuario"
      default:
        return "Usuario"
    }
  }

  const isAdminRole = role === UserRole.ADMIN || role === UserRole.OWNER || role === UserRole.CASHIER

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-11 md:h-14 items-center justify-between border-b bg-background px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {isAdminRole && <MobileSidebar />}
            {title && (
              <h1 className="text-base md:text-2xl font-semibold truncate">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block text-sm text-muted-foreground">
              {getRoleDisplay()}: {user?.username}
            </div>
            <div className="sm:hidden text-xs text-muted-foreground font-medium">{user?.username}</div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>

        <footer className="hidden md:block border-t bg-muted/50 px-4 md:px-6 py-3 shrink-0">
          <div className="text-center text-xs md:text-sm text-muted-foreground">
            © 2025 BetPlatform. Todos los derechos reservados.
          </div>
        </footer>
      </div>

      <MobileBottomNav />
    </div>
  )
}
