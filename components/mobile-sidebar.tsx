"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
  CreditCard,
  Settings,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/lib/mock-data"

interface MobileSidebarProps {
  className?: string
}

export function MobileSidebar({ className }: MobileSidebarProps) {
  const { user, role, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [usersOpen, setUsersOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [open, setOpen] = useState(false)

  const adminMenuItems = [
    {
      title: t("nav.statistics"),
      href: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      title: t("nav.users"),
      icon: Users,
      collapsible: true,
      isOpen: usersOpen,
      setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        { title: t("users.createManager"), href: "/admin/users/create-manager" },
        { title: t("users.createUser"), href: "/admin/users/create-user" },
      ],
    },
    {
      title: t("nav.games"),
      href: "/admin/games",
      icon: Gamepad2,
    },
    {
      title: t("nav.reports"),
      icon: FileText,
      collapsible: true,
      isOpen: reportsOpen,
      setOpen: setReportsOpen,
      items: [
        { title: t("reports.bets"), href: "/admin/reports/bets" },
        { title: t("reports.users"), href: "/admin/reports/users" },
        { title: t("reports.earnings"), href: "/admin/reports/earnings" },
      ],
    },
    {
      title: t("nav.earnings"),
      icon: DollarSign,
      items: [{ title: t("earnings.calculate"), href: "/admin/balances" }],
    },
    {
      title: t("nav.transactions"),
      href: "/admin/transactions",
      icon: ArrowUpDown,
    },
    {
      title: t("nav.settings"),
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  const userMenuItems = [
    {
      title: t("nav.dashboard"),
      href: "/user/dashboard",
      icon: BarChart3,
    },
    {
      title: t("nav.profile"),
      href: "/user/profile",
      icon: User,
    },
    {
      title: t("nav.games"),
      href: "/user/games",
      icon: Gamepad2,
    },
    {
      title: t("nav.myBets"),
      href: "/user/bets",
      icon: History,
    },
    {
      title: t("nav.transactions"),
      href: "/user/transactions",
      icon: CreditCard,
    },
    {
      title: t("nav.settings"),
      href: "/user/settings",
      icon: Settings,
    },
  ]


  const isAdminRole = role === "admin" || role === "superadmin";
  const menuItems = isAdminRole ? adminMenuItems : userMenuItems;

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
        <div className="flex h-full flex-col">
    
          <div className="flex h-16 items-center border-b px-6">
            <div className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <span>BetPlatform</span>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
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


          <div className="border-t p-4">
            <div className="mb-2 text-sm text-muted-foreground">
              {role === "admin" ? t("common.admin") : t("common.user")}
            </div>
            <div className="mb-3 text-sm font-medium">{user?.username}</div>
            <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
