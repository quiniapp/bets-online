"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import type { CasinoSettings } from "helper"
import { useTheme } from "next-themes"
import { AuthProvider } from "@/contexts/auth-context"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/components/theme-provider"
import { ParticleBackground } from "@/components/particle-background"
import { LoadingSplash } from "@/components/loading-splash"
import { applyPlatformTheme } from "@/lib/platform-theme"

function CasinoThemeSync() {
  const { setTheme } = useTheme()
  // setTheme from next-themes changes identity with the current theme, so keep it
  // in a ref and run the sync exactly once per page load (empty deps).
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme

  useEffect(() => {
    let active = true
    // Always fetch fresh — the module-level caches in useCasinoSettings / lobby-context
    // can be stale when the admin changed the theme. We skip those caches here so
    // players always see the admin's current choice on every page load.
    fetch('/api/settings/casino', { cache: 'no-store' })
      .then(r => r.json())
      .then((res: { success?: boolean; data?: CasinoSettings | null }) => {
        if (!active || !res?.data) return
        applyPlatformTheme(res.data.theme, res.data.themeConfig, setThemeRef.current)
      })
      .catch(() => {/* silent */})
    return () => { active = false }
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
      <LoadingSplash />
      <ParticleBackground />
      <CasinoThemeSync />
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
