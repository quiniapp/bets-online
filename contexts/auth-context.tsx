"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type User, type Admin, authenticateUser, authenticateAdmin } from "@/lib/mock-data"

interface AuthContextType {
  user: User | Admin | null
  role: "user" | "admin" | null
  login: (credentials: { username: string; password: string }, role: "user" | "admin") => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | Admin | null>(null)
  const [role, setRole] = useState<"user" | "admin" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem("auth_user")
    const savedRole = localStorage.getItem("auth_role")

    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser))
      setRole(savedRole as "user" | "admin")
    }
    setIsLoading(false)
  }, [])

  const login = async (
    credentials: { username: string; password: string },
    userRole: "user" | "admin",
  ): Promise<boolean> => {
    setIsLoading(true)

    try {
      let authenticatedUser: User | Admin | null = null

      if (userRole === "user") {
        authenticatedUser = authenticateUser(credentials.username, credentials.password)
      } else {
        authenticatedUser = authenticateAdmin(credentials.username, credentials.password)
      }

      if (authenticatedUser) {
        setUser(authenticatedUser)
        setRole(userRole)

        // Save to localStorage for persistence
        localStorage.setItem("auth_user", JSON.stringify(authenticatedUser))
        localStorage.setItem("auth_role", userRole)

        return true
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setRole(null)
    localStorage.removeItem("auth_user")
    localStorage.removeItem("auth_role")
  }

  return <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
