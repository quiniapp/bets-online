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
  login: (credentials: { username: string; password: string }) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
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

  const login = async (credentials: { username: string; password: string }): Promise<boolean> => {
    setIsLoading(true)

    try {
      const response = await apiService.login(credentials.username, credentials.password)

      if (response.success && response.data) {
        setUser(response.data.user)
        setRole(response.data.user.role)

        // Save user to localStorage for quick access
        localStorage.setItem("auth_user", JSON.stringify(response.data.user))
        localStorage.setItem("auth_role", response.data.user.role)

        return true
      }

      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await apiService.logout()
    setUser(null)
    setRole(null)
    localStorage.removeItem("auth_user")
    localStorage.removeItem("auth_role")
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