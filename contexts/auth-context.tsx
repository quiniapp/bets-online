"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type User, type Admin, authenticateUser, authenticateAdmin, Role } from "@/lib/mock-data"
import { useRouter } from "next/navigation"
import ROUTER from "@/routes"

interface AuthContextType {
  user: User | Admin | null
  role: Role | null // ❌ Faltaba | null
  login: (credentials: { username: string; password: string }, role: "user" | "admin") => Promise<boolean> // ❌ Cambiado Role por string literal
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | Admin | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log("🔄 Auth state changed:", { user: user?.username, role }); // DEBUG
  }, [user, role]);

  useEffect(() => {
    console.log("🚀 AuthProvider initializing..."); // DEBUG
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem("auth_user")
    const savedRole = localStorage.getItem("auth_role")

    console.log("💾 localStorage check:", { savedUser: savedUser ? "exists" : "null", savedRole }); // DEBUG

    if (savedUser && savedRole) {
      const parsedUser = JSON.parse(savedUser)
      console.log("✅ Restoring session:", { user: parsedUser.username, role: savedRole }); // DEBUG
      setUser(parsedUser)
      setRole(savedRole as Role)
    }
    setIsLoading(false)
  }, [])

  const login = async (
    credentials: { username: string; password: string },
    userRole: "user" | "admin",
  ): Promise<boolean> => {
    console.log("🔐 Login attempt:", { credentials, userRole }); // DEBUG
    setIsLoading(true)

    try {
      let authenticatedUser: User | Admin | null = null

      if (userRole === "user") {
        authenticatedUser = authenticateUser(credentials.username, credentials.password)
        console.log("👤 User auth result:", authenticatedUser); // DEBUG
        if (authenticatedUser) {
          setRole(Role.user)
        }
      } else {
        authenticatedUser = authenticateAdmin(credentials.username, credentials.password)
        console.log("👑 Admin auth result:", authenticatedUser); // DEBUG
        if (authenticatedUser) {
          setRole((authenticatedUser as Admin).role)
        }
      }

      if (authenticatedUser) {
        setUser(authenticatedUser)
        console.log("✅ User set:", authenticatedUser); // DEBUG
        console.log("✅ Role set:", userRole === "user" ? Role.user : (authenticatedUser as Admin).role); // DEBUG

        // Save to localStorage for persistence
        localStorage.setItem("auth_user", JSON.stringify(authenticatedUser))
        localStorage.setItem("auth_role", userRole === "user" ? Role.user : (authenticatedUser as Admin).role)

        return true
      }

      console.log("❌ Authentication failed"); // DEBUG
      return false
    } catch (error) {
      console.error("🚨 Login error:", error); // DEBUG
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
    router.push(ROUTER.LOGIN)
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