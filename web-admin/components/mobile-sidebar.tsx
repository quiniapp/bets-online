"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  BarChart3,
  Users,
  FileText,
  DollarSign,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  LogOut,
  Gamepad2,
  User,
  History,
  Settings,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserRole } from "helper"

interface MobileSidebarProps {
  className?: string
}

export function MobileSidebar({ className }: MobileSidebarProps) {
  const { user, role, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [usersOpen, setUsersOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [open, setOpen] = useState(false)

  const ownerMenuItems = [
    { title: "Inicio", href: "/admin/dashboard", icon: BarChart3 },
    {
      title: t("nav.users"), icon: Users, collapsible: true, isOpen: usersOpen, setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        { title: "Alta de Administrador", href: "/admin/users/create-manager" },
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
    },
    { title: t("nav.games"), href: "/admin/games", icon: Gamepad2 },
    {
      title: t("nav.reports"), icon: FileText, collapsible: true, isOpen: reportsOpen, setOpen: setReportsOpen,
      items: [
        { title: t("reports.bets"), href: "/admin/reports/bets" },
        { title: t("reports.users"), href: "/admin/reports/users" },
        { title: t("reports.earnings"), href: "/admin/reports/earnings" },
      ],
    },
    { title: t("nav.earnings"), icon: DollarSign, items: [{ title: t("earnings.calculate"), href: "/admin/balances" }] },
    { title: t("nav.transactions"), href: "/admin/transactions", icon: ArrowUpDown },
    {
      title: t("nav.settings"), icon: Settings, collapsible: true, isOpen: settingsOpen, setOpen: setSettingsOpen,
      items: [
        { title: "General", href: "/admin/settings" },
        { title: "Casino Layout", href: "/admin/settings/casino" },
      ],
    },
  ]

  const adminMenuItems = [
    { title: "Inicio", href: "/admin/dashboard", icon: BarChart3 },
    {
      title: t("nav.users"), icon: Users, collapsible: true, isOpen: usersOpen, setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        { title: "Alta de Administrador", href: "/admin/users/create-manager" },
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
    },
    {
      title: t("nav.reports"), icon: FileText, collapsible: true, isOpen: reportsOpen, setOpen: setReportsOpen,
      items: [
        { title: t("reports.bets"), href: "/admin/reports/bets" },
        { title: t("reports.users"), href: "/admin/reports/users" },
        { title: t("reports.earnings"), href: "/admin/reports/earnings" },
      ],
    },
    { title: t("nav.transactions"), href: "/admin/transactions", icon: ArrowUpDown },
    { title: t("nav.settings"), href: "/admin/settings", icon: Settings },
  ]

  const cashierMenuItems = [
    { title: "Inicio", href: "/cashier/dashboard", icon: BarChart3 },
    {
      title: t("nav.users"), icon: Users, collapsible: true, isOpen: usersOpen, setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
    },
    { title: t("nav.transactions"), href: "/admin/transactions", icon: ArrowUpDown },
  ]

  const userMenuItems = [
    { title: t("nav.dashboard"), href: "/user/dashboard", icon: BarChart3 },
    { title: t("nav.profile"), href: "/user/profile", icon: User },
    { title: t("nav.games"), href: "/user/games", icon: Gamepad2 },
    { title: t("nav.myBets"), href: "/user/bets", icon: History },
    { title: t("nav.settings"), href: "/user/settings", icon: Settings },
  ]

  const getMenuItems = () => {
    if (role === UserRole.OWNER) return ownerMenuItems
    if (role === UserRole.ADMIN) return adminMenuItems
    if (role === UserRole.CASHIER) return cashierMenuItems
    return userMenuItems
  }
  const menuItems = getMenuItems();

  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("md:hidden", className)}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex h-16 shrink-0 items-center border-b px-6">
            <img src="/logo-small.png" alt="Logo" className="h-10 w-auto max-w-[140px]" />
          </div>

          {/* Navigation */}
          <ScrollArea className="min-h-0 flex-1 px-3 py-4">
            <nav className="space-y-2">
              {menuItems.map((item, index) => (
                <div key={index}>
                  {'collapsible' in item && item.collapsible && 'isOpen' in item && 'setOpen' in item ? (
                    <Collapsible open={item.isOpen} onOpenChange={item.setOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between font-normal">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {item.title}
                          </div>
                          {item.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1">
                        {item?.items?.map((subItem, subIndex) => (
                          <Button
                            key={subIndex}
                            variant={pathname === subItem.href ? "secondary" : "ghost"}
                            className="w-full justify-start pl-8 font-normal"
                            asChild
                            onClick={handleLinkClick}
                          >
                            <Link href={subItem.href}>{subItem.title}</Link>
                          </Button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : 'items' in item && item.items ? (
                    <div>
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="space-y-1">
                        {item.items.map((subItem, subIndex) => (
                          <Button
                            key={subIndex}
                            variant={pathname === subItem.href ? "secondary" : "ghost"}
                            className="w-full justify-start pl-8 font-normal"
                            asChild
                            onClick={handleLinkClick}
                          >
                            <Link href={subItem.href}>{subItem.title}</Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start font-normal"
                      asChild
                      onClick={handleLinkClick}
                    >
                      <Link href={item.href!}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>


          <div className="shrink-0 border-t p-4">
            <div className="mb-2 text-sm text-muted-foreground">
              {role === UserRole.ADMIN || role === UserRole.OWNER ? t("common.admin") : t("common.user")}
            </div>
            <div className="mb-3 text-sm font-medium">{user?.username}</div>
            <Button size="sm" className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
