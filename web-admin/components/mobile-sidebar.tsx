"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserRole } from "helper"
import { useSidebarNavigation } from "@/hooks/useSidebarNavigation"

interface MobileSidebarProps {
  className?: string
}

export function MobileSidebar({ className }: MobileSidebarProps) {
  const { logout } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const {
    user,
    role,
    activeItem,
    menuItems,
    handleNavigation,
    getRoleDisplay,
  } = useSidebarNavigation()

  const handleItemClick = (href: string) => {
    handleNavigation(href)
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
                  {item?.collapsible ? (
                    <Collapsible open={item?.isOpen} onOpenChange={item.setOpen}>
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
                        {item.items?.map((subItem, subIndex) => (
                          <Button
                            key={subIndex}
                            variant={activeItem === subItem.href ? "secondary" : "ghost"}
                            className="w-full justify-start pl-8 font-normal"
                            onClick={() => handleItemClick(subItem.href)}
                          >
                            {subItem.title}
                          </Button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : item.items ? (
                    <div>
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="space-y-1">
                        {item.items.map((subItem, subIndex) => (
                          <Button
                            key={subIndex}
                            variant={activeItem === subItem.href ? "secondary" : "ghost"}
                            className="w-full justify-start pl-8 font-normal"
                            onClick={() => handleItemClick(subItem.href)}
                          >
                            {subItem.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant={activeItem === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start font-normal"
                      onClick={() => handleItemClick(item.href!)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>


          <div className="shrink-0 border-t p-4">
            <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
              {role === UserRole.OWNER && <Shield className="h-3 w-3" />}
              {getRoleDisplay()}
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
