"use client"

import * as React from "react"
import { Dices, Moon, Sun, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { markUserThemeOverride } from "@/lib/theme-sync"
import { UserRole } from "helper"

const THEMES = [
  {
    id: "light",
    label: "Claro",
    icon: Sun,
    iconColor: "text-amber-500",
  },
  {
    id: "dark",
    label: "Oscuro",
    icon: Moon,
    iconColor: "text-blue-400",
  },
  {
    id: "casino",
    label: "Casino Virtual",
    icon: Dices,
    iconColor: "text-emerald-400",
  },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { role } = useAuth()
  const { toast } = useToast()
  const isAdminOrOwner = role === UserRole.OWNER || role === UserRole.ADMIN
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelectTheme = async (id: string) => {
    if (!isAdminOrOwner) return
    // The server theme is applied once by AdminThemeSync in providers.tsx. Tell it
    // not to overwrite this pick if its request is still in flight.
    markUserThemeOverride()
    const previous = theme ?? 'dark'
    setTheme(id)
    try {
      const res = await apiService.patch('/settings/casino', { theme: id })
      if (!res.success) {
        setTheme(previous)
        toast({
          title: "No se pudo cambiar el tema",
          description: res.error?.message || "El servidor rechazó el cambio",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      setTheme(previous)
      toast({
        title: "No se pudo cambiar el tema",
        description: err?.message || "Error de red al guardar el tema",
        variant: "destructive",
      })
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 md:h-8 md:w-8"
        aria-label="Cargando tema"
        disabled
      >
        <span className="h-4 w-4" />
      </Button>
    )
  }

  // Only OWNER/ADMIN may change the platform theme. The effect above still runs for
  // every role, so staff without permission keep following the admin's choice.
  if (!isAdminOrOwner) {
    return null
  }

  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[1]
  const Icon = currentTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-8 md:w-8 relative"
          aria-label={`Tema actual: ${currentTheme.label}. Clic para cambiar`}
          title={`Tema actual: ${currentTheme.label}`}
        >
          <Icon className={`h-4 w-4 transition-transform ${currentTheme.iconColor}`} />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map(({ id, label, icon: ItemIcon, iconColor }) => {
          const isSelected = (theme ?? "dark") === id
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => handleSelectTheme(id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ItemIcon className={`h-4 w-4 ${iconColor}`} />
                <span>{label}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
