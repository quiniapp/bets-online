"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import type { User, UserRole } from "helper"
import ROUTER from "@/routes"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutos
const LAST_ACTIVE_KEY = 'lastActiveAt'

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
    localStorage.removeItem(LAST_ACTIVE_KEY)
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

    if (!apiService.hasSession()) {
      router.push(ROUTER.SITE)
      setIsLoading(false)
      return
    }

    // Verificar inactividad entre sesiones de browser (sliding window)
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)
    if (lastActive && Date.now() - parseInt(lastActive) > INACTIVITY_TIMEOUT) {
      clearSession()
      router.push(ROUTER.SITE)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiService.getCurrentUser()

      if (response.success && response.data) {
        setUser(response.data)
        setRole(response.data.role)
        // Marcar momento de carga como actividad
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
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
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
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

  // Sliding window de inactividad: 10 minutos sin actividad → logout
  // También actualiza lastActiveAt en localStorage para detectar inactividad
  // al reabrir el browser
  useEffect(() => {
    if (!user) return

    if (typeof window !== 'undefined' && window.location.pathname === ROUTER.LOGIN) {
      return
    }

    let inactivityTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
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
