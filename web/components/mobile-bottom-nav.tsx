"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import { LayoutDashboard, Gamepad2, History, User, Users, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()
  const { role } = useAuth()

  const isAdminRole = role === UserRole.ADMIN || role === UserRole.OWNER || role === UserRole.CASHIER

  const playerItems = [
    { href: "/user/dashboard", icon: LayoutDashboard, label: "Inicio" },
    { href: "/user/games", icon: Gamepad2, label: "Juegos" },
    { href: "/user/bets", icon: History, label: "Apuestas" },
    { href: "/user/profile", icon: User, label: "Perfil" },
  ]

  const adminItems = [
    { href: "/admin/dashboard", icon: BarChart3, label: "Stats" },
    { href: "/admin/users", icon: Users, label: "Usuarios" },
    { href: "/admin/games", icon: Gamepad2, label: "Juegos" },
    { href: "/admin/settings", icon: Settings, label: "Config" },
  ]

  const items = isAdminRole ? adminItems : playerItems

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16">
        {items.map((item) => {
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
        })}
      </div>
    </nav>
  )
}
