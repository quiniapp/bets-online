"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type User, type Admin, authenticateUser, authenticateAdmin, Role } from "@/lib/mock-data"
import { useRouter } from "next/navigation"
import ROUTER from "@/routes"

interface AuthContextType {
  user: User | Admin | null
  role: Role | null  
  login: (credentials: { username: string; password: string }, role: "user" | "admin") => Promise<boolean> 
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
  
    const savedUser = localStorage.getItem("auth_user")
    const savedRole = localStorage.getItem("auth_role")


    if (savedUser && savedRole) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      setRole(savedRole as Role)
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
        if (authenticatedUser) {
          setRole(Role.user)
        }
      } else {
        authenticatedUser = authenticateAdmin(credentials.username, credentials.password)
        if (authenticatedUser) {
          setRole((authenticatedUser as Admin).role)
        }
      }

      if (authenticatedUser) {
        setUser(authenticatedUser)
      
        // Save to localStorage for persistence
        localStorage.setItem("auth_user", JSON.stringify(authenticatedUser))
        localStorage.setItem("auth_role", userRole === "user" ? Role.user : (authenticatedUser as Admin).role)

        return true
      }

    
      return false
    } catch (error) {
     
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