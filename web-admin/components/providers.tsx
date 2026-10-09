"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { apiService } from "@/services/api.service"
import { AuthProvider } from "@/contexts/auth-context"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/components/theme-provider"
import { hasUserThemeOverride } from "@/lib/theme-sync"

const VALID_THEMES = ["light", "dark", "casino"]

/**
 * Applies the platform theme stored in casino_settings exactly once per page load.
 *
 * It must not depend on setTheme: in next-themes that callback changes identity
 * every time the current theme changes, so an effect that depends on it re-runs
 * on each change and re-fetches the server value, overwriting whatever the user
 * just picked. Keeping it in a ref lets the effect run once with empty deps.
 */
function AdminThemeSync() {
  const { setTheme } = useTheme()
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme

  useEffect(() => {
    let active = true
    apiService
      .get<{ theme?: string }>('/settings/casino')
      .then(res => {
        const theme = res.data?.theme
        // If the user already changed the theme while this request was in flight,
        // their pick (and the PATCH it triggered) wins.
        if (!active || hasUserThemeOverride()) return
        if (res.success && theme && VALID_THEMES.includes(theme)) {
          setThemeRef.current(theme)
        }
      })
      .catch(() => {
        // Keep the locally stored theme until the next load.
      })
    return () => {
      active = false
    }
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={["light", "dark", "casino"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <AdminThemeSync />
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
