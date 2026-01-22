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
    // Only run on client
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const token = apiService.getAccessToken()
      if (token) {
        const response = await apiService.getCurrentUser()
        if (response.success && response.data) {
          setUser(response.data)
          setRole(response.data.role)
        } else {
          // Token invalid, clear it
          apiService.setAccessToken(null)
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      apiService.setAccessToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: { username: string; password: string }): Promise<User | null> => {
    setIsLoading(true)

    try {
      const response = await apiService.login(credentials.username, credentials.password)

      if (response.success && response.data) {
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
    router.push(ROUTER.LOGIN)
  }

  const refreshUser = async () => {
    await loadUser()
  }

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