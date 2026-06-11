"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import { SESSION_IDLE_MS, type User, type UserRole } from "helper"
import ROUTER from "@/routes"
import { getSiteType, isRoleAllowedForSite, SITE_ACCESS_ERROR } from "@/lib/site-config"

const INACTIVITY_TIMEOUT = SESSION_IDLE_MS
const INACTIVITY_SECONDS = SESSION_IDLE_MS / 1000
const LAST_ACTIVE_COOKIE = 'last-active'
// Watchdog runs every 2 min: if the last-active cookie expired → force logout.
const SESSION_WATCHDOG_INTERVAL = 2 * 60 * 1000
// While the user is genuinely active, ping the server at most this often so the
// server-side inactivity window (sessions.expires_at) keeps sliding even during
// long stretches of UI-only activity without API calls.
const ACTIVITY_PING_INTERVAL = 5 * 60 * 1000

const setLastActiveCookie = () => {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LAST_ACTIVE_COOKIE}=1; max-age=${INACTIVITY_SECONDS}; path=/; SameSite=Strict${secure}`
}

const hasLastActiveCookie = (): boolean => {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${LAST_ACTIVE_COOKIE}=`))
}

const clearLastActiveCookie = () => {
  document.cookie = `${LAST_ACTIVE_COOKIE}=; max-age=0; path=/`
}

interface AuthContextType {
  user: User | null
  role: UserRole | null
  login: (credentials: { username: string; password: string }) => Promise<User | null>
  logout: () => void
  isLoading: boolean
  refreshUser: () => Promise<void>
  keepAlive: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadUser()
    }
  }, [mounted])

  const clearSession = useCallback(() => {
    apiService.setSessionActive(false)
    clearLastActiveCookie()
  }, [])

  const loadUser = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    if (window.location.pathname === ROUTER.LOGIN) {
      setIsLoading(false)
      return
    }

    const isPublicPage = window.location.pathname === ROUTER.SITE

    if (apiService.hasSession() && !hasLastActiveCookie()) {
      clearSession()
      if (!isPublicPage) router.push(ROUTER.SITE)
      setIsLoading(false)
      return
    }

    if (!apiService.hasSession()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiService.getCurrentUser()

      if (response.success && response.data) {
        const siteType = getSiteType()
        if (!isRoleAllowedForSite(response.data.role, siteType)) {
          await apiService.logout()
          clearSession()
          setIsLoading(false)
          return
        }
        setUser(response.data)
        setRole(response.data.role)
        setLastActiveCookie()
      } else {
        clearSession()
        if (!isPublicPage) router.push(ROUTER.SITE)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      clearSession()
      if (!isPublicPage) router.push(ROUTER.SITE)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: { username: string; password: string }): Promise<User | null> => {
    setIsLoading(true)

    try {
      const response = await apiService.login(credentials.username, credentials.password)

      if (response.success && response.data?.user) {
        const loggedInUser = response.data.user
        const siteType = getSiteType()
        if (!isRoleAllowedForSite(loggedInUser.role, siteType)) {
          await apiService.logout()
          throw new Error(SITE_ACCESS_ERROR[siteType])
        }
        setUser(loggedInUser)
        setRole(loggedInUser.role)
        setLastActiveCookie()
        return loggedInUser
      }

      return null
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(async () => {
    await apiService.logout()
    clearSession()
    setUser(null)
    setRole(null)
    router.push(ROUTER.LOGIN)
  }, [router, clearSession])

  const refreshUser = async () => {
    await loadUser()
  }

  // Resets the inactivity timer and renews the last-active cookie.
  // Extracted so keepAlive can call it without re-registering event listeners.
  const lastPingRef = useRef(Date.now())
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    setLastActiveCookie()
    inactivityTimerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT)

    // Real user activity also slides the SERVER inactivity window (throttled).
    // API calls already slide it via the auth middleware; this covers long
    // stretches of reading/scrolling without requests.
    const now = Date.now()
    if (now - lastPingRef.current > ACTIVITY_PING_INTERVAL) {
      lastPingRef.current = now
      apiService.refreshToken().then(ok => {
        // Refresh definitivamente muerto (no error de red): la sesión server-side
        // expiró → cerrar la sesión local de inmediato.
        if (!ok && !apiService.hasSession()) logout()
      }).catch(() => {})
    }
  }, [logout])

  // Exposed for game pages where the iframe swallows all activity events.
  // Call this on a short interval (~5 min) to keep the session alive while gaming.
  const keepAlive = useCallback(() => {
    if (!user) return
    resetInactivityTimer()
    apiService.refreshToken().catch(() => {})
  }, [user, resetInactivityTimer])

  // Sliding window: every activity event renews the cookie maxAge and resets the timer.
  useEffect(() => {
    if (!user) return

    if (typeof window !== 'undefined' && window.location.pathname === ROUTER.LOGIN) {
      return
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })

    resetInactivityTimer()

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [user, resetInactivityTimer])

  // Session watchdog: every 2 min, if the last-active cookie expired (>30 min
  // without activity) → force logout. Primary fallback for background-throttled
  // tabs where setTimeout doesn't fire. NOTE: it must NOT refresh tokens here —
  // refreshing without real activity would keep dead-idle sessions alive forever.
  useEffect(() => {
    if (!user) return

    const check = async () => {
      if (!hasLastActiveCookie() && apiService.hasSession()) {
        await logout()
      }
    }

    const interval = setInterval(check, SESSION_WATCHDOG_INTERVAL)
    return () => clearInterval(interval)
  }, [user, logout])

  // Tab visibility: immediately check when user returns to an idle tab.
  useEffect(() => {
    if (!user) return

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && !hasLastActiveCookie() && apiService.hasSession()) {
        await logout()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, logout])

  // Multi-tab: sincronizar logout cuando session_active se elimina en otra tab
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_active' && !e.newValue) {
        setUser(null)
        setRole(null)
        router.push(ROUTER.LOGIN)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router])

  return (
    <AuthContext.Provider value={{ user, role, login, logout, isLoading, refreshUser, keepAlive }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
