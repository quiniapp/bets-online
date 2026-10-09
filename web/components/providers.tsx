"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { AuthProvider } from "@/contexts/auth-context"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/components/theme-provider"

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
      .then((res: { success?: boolean; data?: { theme?: string } }) => {
        const theme = res?.data?.theme
        if (active && (theme === 'light' || theme === 'dark' || theme === 'casino')) {
          setThemeRef.current(theme)
        }
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
      <CasinoThemeSync />
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
