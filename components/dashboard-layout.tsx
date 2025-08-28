"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Role } from "@/lib/mock-data"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, role } = useAuth()


  const getRoleDisplay = () => {
    switch (role) {
      case Role.superadmin:
        return "Administrador"
      case Role.admin:
        return "Cajero"
      case Role.user:
        return "Usuario"
      default:
        return "Usuario"
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar />
            {title && <h1 className="text-lg md:text-2xl font-semibold truncate">{title}</h1>}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block text-sm text-muted-foreground">
              {getRoleDisplay()}: {user?.username}
            </div>
            <div className="sm:hidden text-xs text-muted-foreground">{user?.username}</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>

        <footer className="border-t bg-muted/50 px-4 md:px-6 py-3">
          <div className="text-center text-xs md:text-sm text-muted-foreground">
            © 2025 BetPlatform. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    </div>
  )
}