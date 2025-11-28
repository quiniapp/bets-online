"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Gamepad2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/mock-data";
import { useSidebarNavigation } from "@/hooks/useSidebarNavigation";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const {
    user,
    role,
    activeItem,
    menuItems,
    handleNavigation,
    getRoleDisplay,
  } = useSidebarNavigation();

  return (
    <div
      className={cn(
        "hidden md:flex h-full w-64 flex-col border-r bg-background",
        className
      )}
    >
      {/* Logo */}
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
              {item?.collapsible ? (
                <Collapsible open={item?.isOpen} onOpenChange={item.setOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      {item.isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {item.items?.map((subItem, subIndex) => (
                      <Button
                        key={subIndex}
                        variant={
                          activeItem === subItem.href ? "secondary" : "ghost"
                        }
                        className="w-full justify-start pl-8 font-normal"
                        onClick={() => handleNavigation(subItem.href)}
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
                        variant={
                          activeItem === subItem.href ? "secondary" : "ghost"
                        }
                        className="w-full justify-start pl-8 font-normal"
                        onClick={() => handleNavigation(subItem.href)}
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
                  onClick={() => handleNavigation(item.href!)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User info and logout */}
      <div className="border-t p-4">
        <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
          {role === Role.superadmin && <Shield className="h-3 w-3" />}
          {getRoleDisplay()}
        </div>
        <div className="mb-3 text-sm font-medium">{user?.username}</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-transparent"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}