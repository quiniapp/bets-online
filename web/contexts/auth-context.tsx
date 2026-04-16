"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import type { User, UserRole } from "helper"
import ROUTER from "@/routes"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutos en ms
const INACTIVITY_SECONDS = 10 * 60         // 10 minutos en segundos (para maxAge de cookie)
const LAST_ACTIVE_COOKIE = 'last-active'

// Cookie no-httpOnly manejada desde JS.
// maxAge=INACTIVITY_SECONDS → el browser la expira automáticamente si no se renueva.
// La existencia de la cookie indica que la sesión está dentro de la ventana de inactividad.
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

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

    const publicPaths = [ROUTER.SITE, ROUTER.LOGIN]
    if (publicPaths.includes(window.location.pathname)) {
      setIsLoading(false)
      return
    }

    // Si hay indicador de sesión pero la cookie de actividad expiró → inactividad detectada
    if (apiService.hasSession() && !hasLastActiveCookie()) {
      clearSession()
      router.push(ROUTER.SITE)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiService.getCurrentUser()

      if (response.success && response.data) {
        // Sincronizar flag si las cookies eran válidas pero localStorage fue limpiado
        if (!apiService.hasSession()) {
          apiService.setSessionActive(true)
        }
        setUser(response.data)
        setRole(response.data.role)
        setLastActiveCookie()
      } else {
        clearSession()
        router.push(ROUTER.SITE)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      clearSession()
      router.push(ROUTER.SITE)
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
        setUser(loggedInUser)
        setRole(loggedInUser.role)
        setLastActiveCookie()
        return loggedInUser
      }

      return null
    } catch (error) {
      console.error('Login failed:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(async () => {
    await apiService.logout()
    clearSession()
    setUser(null)
    setRole(null)
    router.push(ROUTER.SITE)
  }, [router, clearSession])

  const refreshUser = async () => {
    await loadUser()
  }

  // Sliding window: cada evento de actividad renueva el maxAge de la cookie.
  // Si pasan 10 min sin eventos → cookie expira sola → próximo loadUser bloquea.
  // El timer sigue siendo necesario para el logout inmediato con página abierta.
  useEffect(() => {
    if (!user) return

    if (typeof window !== 'undefined' && window.location.pathname === ROUTER.LOGIN) {
      return
    }

    let inactivityTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      setLastActiveCookie() // Renueva maxAge → reinicia ventana de 10 min
      inactivityTimer = setTimeout(() => {
        logout()
      }, INACTIVITY_TIMEOUT)
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [user, logout])

  // Multi-tab: sincronizar logout cuando session_active se elimina en otra tab
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_active' && !e.newValue) {
        setUser(null)
        setRole(null)
        router.push(ROUTER.SITE)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router])

  return (
    <AuthContext.Provider value={{ user, role, login, logout, isLoading, refreshUser }}>
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
