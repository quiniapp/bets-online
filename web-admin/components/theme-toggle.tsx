"use client"

import * as React from "react"
import { Check, Dices, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import type { CasinoSettings, SavedCustomTheme } from "helper"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { markUserThemeOverride } from "@/lib/theme-sync"
import { applyCustomTheme, applyPlatformTheme } from "@/lib/platform-theme"
import { UserRole } from "helper"

const PRESETS = [
  { id: "light", label: "Claro", icon: Sun, iconColor: "text-amber-500" },
  { id: "dark", label: "Oscuro", icon: Moon, iconColor: "text-blue-400" },
  { id: "casino", label: "Casino Virtual", icon: Dices, iconColor: "text-emerald-400" },
] as const

type PresetId = (typeof PRESETS)[number]["id"]

/**
 * Platform theme selector. It is the ONLY place that applies a theme: the base
 * presets and every theme saved with the generator. The generator never applies
 * anything by itself, so the defaults are always available here.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { role } = useAuth()
  const { toast } = useToast()
  const isOwner = role === UserRole.OWNER
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [savedThemes, setSavedThemes] = React.useState<SavedCustomTheme[]>([])
  const [activeThemeId, setActiveThemeId] = React.useState<string | null>(null)
  const [platformTheme, setPlatformTheme] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const loadCatalog = React.useCallback(async () => {
    try {
      const res = await apiService.get<CasinoSettings>('/settings/casino')
      if (res.success && res.data) {
        setSavedThemes(res.data.savedThemes ?? [])
        setActiveThemeId(res.data.activeThemeId ?? null)
        setPlatformTheme(res.data.theme)
      }
    } catch {
      // Keep the last known catalog.
    }
  }, [])

  React.useEffect(() => {
    if (isOwner) loadCatalog()
  }, [isOwner, loadCatalog])

  const fail = (message?: string) =>
    toast({
      title: "No se pudo cambiar el tema",
      description: message || "El servidor rechazó el cambio",
      variant: "destructive",
    })

  const applyPreset = async (preset: PresetId) => {
    if (!isOwner) return
    markUserThemeOverride()
    const previous = theme ?? 'dark'
    applyPlatformTheme(preset, null, setTheme)
    try {
      const res = await apiService.patch('/settings/casino', { theme: preset, activeThemeId: null })
      if (!res.success) {
        setTheme(previous)
        fail(res.error?.message)
        return
      }
      setActiveThemeId(null)
      setOpen(false)
    } catch (err: any) {
      setTheme(previous)
      fail(err?.message)
    }
  }

  const applySavedTheme = async (saved: SavedCustomTheme) => {
    if (!isOwner) return
    markUserThemeOverride()
    const previous = theme ?? 'dark'
    applyCustomTheme(saved.config, setTheme)
    try {
      const res = await apiService.patch('/settings/casino', {
        theme: 'custom',
        themeConfig: saved.config,
        activeThemeId: saved.id,
      })
      if (!res.success) {
        setTheme(previous)
        fail(res.error?.message)
        return
      }
      setActiveThemeId(saved.id)
      setOpen(false)
    } catch (err: any) {
      setTheme(previous)
      fail(err?.message)
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

  // Only the OWNER may change the platform theme. Staff without permission still
  // follow it because AdminThemeSync applies the server theme for everyone.
  if (!isOwner) {
    return null
  }

  const customActive = activeThemeId !== null || platformTheme === 'custom'
  const activePreset = customActive ? undefined : PRESETS.find(p => p.id === theme) ?? PRESETS[1]
  const activeSaved = activeThemeId ? savedThemes.find(t => t.id === activeThemeId) : undefined
  const Icon = activePreset?.icon ?? Palette
  const currentLabel = activeSaved?.name ?? activePreset?.label ?? "Tema"
  const iconColor = activePreset?.iconColor ?? "text-primary"

  return (
    <DropdownMenu
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (next) loadCatalog()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-8 md:w-8 relative"
          aria-label={"Tema actual: " + currentLabel + ". Clic para cambiar"}
          title={"Tema actual: " + currentLabel}
        >
          <Icon className={"h-4 w-4 transition-transform " + iconColor} />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Temas base</DropdownMenuLabel>
        {PRESETS.map(({ id, label, icon: ItemIcon, iconColor: presetColor }) => {
          const isSelected = !customActive && (theme ?? "dark") === id
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => applyPreset(id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ItemIcon className={"h-4 w-4 " + presetColor} />
                <span>{label}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}

        {savedThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Temas guardados</DropdownMenuLabel>
            {savedThemes.map(saved => {
              const isSelected = activeThemeId === saved.id
              return (
                <DropdownMenuItem
                  key={saved.id}
                  onClick={() => applySavedTheme(saved)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Palette className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{saved.name}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
