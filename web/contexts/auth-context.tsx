"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import type { User, UserRole } from "helper"
import ROUTER from "@/routes"

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

  // Ensure we're mounted before hydrating
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load user on mount
  useEffect(() => {
    if (mounted) {
      loadUser()
    }
  }, [mounted])

  const loadUser = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // No validar en páginas públicas
    const publicPaths = [ROUTER.SITE, ROUTER.LOGIN]
    if (publicPaths.includes(window.location.pathname)) {
      setIsLoading(false)
      return
    }

    // Sin indicador de sesión → redirigir sin llamar a la API
    if (!apiService.hasSession()) {
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
      } else {
        apiService.setSessionActive(false)
        router.push(ROUTER.SITE)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      apiService.setSessionActive(false)
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

  const logout = async () => {
    await apiService.logout()
    setUser(null)
    setRole(null)
    router.push(ROUTER.SITE)
  }

  const refreshUser = async () => {
    await loadUser()
  }

  // Inactivity Timer: Auto-logout after 30 minutes without activity
  useEffect(() => {
    // Solo activar si hay usuario logueado
    if (!user) return

    // No activar en página de login
    if (typeof window !== 'undefined' && window.location.pathname === ROUTER.LOGIN) {
      return
    }

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos en ms
    let inactivityTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        console.log('Session expired due to inactivity')
        logout()
      }, INACTIVITY_TIMEOUT)
    }

    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    // Iniciar el timer
    resetTimer()

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer)
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [user, logout])

  // Multi-tab synchronization: sincronizar logout entre tabs
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

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
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