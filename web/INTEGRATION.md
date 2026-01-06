# Frontend to API Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Pre-Integration Checklist](#pre-integration-checklist)
4. [Step-by-Step Integration](#step-by-step-integration)
5. [Required Changes by File](#required-changes-by-file)
6. [Environment Configuration](#environment-configuration)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide explains how to integrate the **Next.js frontend** (`web/`) with the **Express API** (`api/`) for the casino betting platform. The current frontend uses mock data and localStorage authentication, which needs to be replaced with real API calls.

**Goal:** Replace all mock data sources with API calls while maintaining the current UI/UX.

---

## Current State Analysis

### ✅ What's Already Good

- ✅ `helper` package already installed as dependency
- ✅ Next.js 15 with App Router setup
- ✅ TypeScript configured
- ✅ React Hook Form for form handling
- ✅ Zod for validation (compatible with API)
- ✅ UI components with shadcn/ui
- ✅ Auth context structure in place

### ❌ What Needs to Change

- ❌ No `services/` folder (API integration layer missing)
- ❌ Auth context uses mock data from `lib/mock-data.ts`
- ❌ All pages use mock data instead of API calls
- ❌ No environment variables for API URL
- ❌ Type mismatches between mock types and API types
- ❌ Role/permission system doesn't match API (OWNER, ADMIN, CASHIER, PLAYER)
- ❌ No token management (JWT access/refresh tokens)
- ❌ No API error handling

---

## Pre-Integration Checklist

Before starting the integration, ensure:

- [ ] API is running at `http://localhost:3001`
- [ ] API health check responds: `GET http://localhost:3001/api/health`
- [ ] You have test credentials for login
- [ ] `helper` package is installed: `pnpm install` (should already be there)
- [ ] API documentation reviewed: `api/INTEGRATION.md`

---

## Step-by-Step Integration

### Step 1: Environment Configuration

Create `.env.local` file in `web/` directory:

```bash
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Update `config/index.ts`:

```typescript
// web/config/index.ts
export const CONFIG = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
}
```

---

### Step 2: Create API Service Layer

Create the services directory and API service file:

**File:** `web/services/api.service.ts` (NEW FILE)

```typescript
// web/services/api.service.ts
import type { ApiResponse, User, AuthTokens } from 'helper';

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      // Auto-refresh token on 401
      if (!data.success && data.error?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request with new token
          return this.request<T>(endpoint, options);
        } else {
          // Refresh failed, logout
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async login(username: string, password: string) {
    const response = await this.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/login', { username, password });

    if (response.success && response.data) {
      this.setAccessToken(response.data.tokens.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      }
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await this.post<AuthTokens>('/auth/refresh', {
        refreshToken,
      });

      if (response.success && response.data) {
        this.setAccessToken(response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
      }
    }
  }

  async getCurrentUser() {
    return this.get<User>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }
}

export const apiService = new ApiService();
```

---

### Step 3: Update Auth Context

Replace the mock authentication with real API calls.

**File:** `web/contexts/auth-context.tsx` (MODIFY)

```typescript
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
```

---

### Step 4: Update Login Hook

Update the login hook to work with the new auth context.

**File:** `web/feature/login/hook/useLogin.ts` (MODIFY)

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "helper";

interface LoginFormData {
  email: string;
  password: string;
}

const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, role } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<LoginFormData>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const success = await login({
        username: data.email,
        password: data.password
      });

      if (success) {
        // Wait for role to be set
        setTimeout(() => {
          const userRole = localStorage.getItem("auth_role") as UserRole;

          // Redirect based on role
          switch (userRole) {
            case UserRole.OWNER:
            case UserRole.ADMIN:
              router.push("/admin/dashboard");
              break;
            case UserRole.CASHIER:
              router.push("/cashier/dashboard"); // Create this route
              break;
            case UserRole.PLAYER:
              router.push("/user/dashboard");
              break;
            default:
              router.push("/");
          }
        }, 100);
      } else {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }

    } catch (error: any) {
      console.error("Error en login:", error);
      setError(error?.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const validationRules = {
    email: {
      required: "El usuario es requerido",
    },
    password: {
      required: "La contraseña es requerida",
      minLength: {
        value: 8,
        message: "La contraseña debe tener al menos 8 caracteres"
      }
    }
  };

  const clearError = () => {
    setError("");
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isValid,
    watch,
    reset,
    isLoading,
    error,
    validationRules,
    onSubmit,
    clearError,
  };
};

export default useLogin;
```

---

### Step 5: Create Custom Hooks for Data Fetching

Create hooks to interact with the API endpoints.

**File:** `web/hooks/useUsers.ts` (NEW FILE)

```typescript
// web/hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { User, CreateUserDto, UpdateUserDto, UserTreeNode } from 'helper';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<User[]>('/users/me/children');

      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error?.message || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserDto) => {
    try {
      const response = await apiService.post<User>('/users', userData);

      if (response.success && response.data) {
        setUsers([...users, response.data]);
      }

      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserDto) => {
    try {
      const response = await apiService.patch<User>(`/users/${userId}`, userData);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const blockUser = async (userId: string) => {
    try {
      const response = await apiService.post<User>(`/users/${userId}/block`);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const response = await apiService.post<User>(`/users/${userId}/unblock`);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  };

  const getUserTree = async () => {
    try {
      const response = await apiService.get<UserTreeNode>('/users/me/tree');
      return response;
    } catch (error) {
      console.error('Failed to load user tree:', error);
      throw error;
    }
  };

  const resetPassword = async (userId: string, newPassword: string) => {
    try {
      const response = await apiService.post(`/users/${userId}/reset-password`, {
        userId,
        newPassword,
      });

      return response;
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    getUserTree,
    resetPassword,
    reload: loadUsers,
  };
}
```

**File:** `web/hooks/useChips.ts` (NEW FILE)

```typescript
// web/hooks/useChips.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { Balance, ChipMovement, ApiResponse, PaginationMeta } from 'helper';

export function useChips(userId?: string) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [movements, setMovements] = useState<ChipMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = async () => {
    try {
      const endpoint = userId
        ? `/chips/balance/${userId}`
        : '/chips/my-balance';

      const response = await apiService.get<Balance>(endpoint);

      if (response.success && response.data) {
        setBalance(response.data);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadMovements = async (page = 1, limit = 10) => {
    if (!userId) return;

    setLoading(true);

    try {
      const response = await apiService.get<ChipMovement[]>(
        `/chips/movements/${userId}?page=${page}&limit=${limit}`
      );

      if (response.success && response.data) {
        setMovements(response.data);
        setMeta(response.meta || null);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const sellChips = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/sell', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to sell chips:', error);
      throw error;
    }
  };

  const payPrize = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/prize', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to pay prize:', error);
      throw error;
    }
  };

  const registerLoss = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/loss', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to register loss:', error);
      throw error;
    }
  };

  const withdraw = async (playerId: string, amount: number, description?: string) => {
    try {
      const response = await apiService.post('/chips/withdraw', {
        playerId,
        amount,
        description,
      });

      if (response.success) {
        await loadBalance();
        if (userId) await loadMovements();
      }

      return response;
    } catch (error) {
      console.error('Failed to withdraw:', error);
      throw error;
    }
  };

  return {
    balance,
    movements,
    meta,
    loading,
    loadBalance,
    loadMovements,
    sellChips,
    payPrize,
    registerLoss,
    withdraw,
  };
}
```

---

### Step 6: Update Routes Configuration

Update the routes to match the API's role system.

**File:** `web/routes/index.ts` (MODIFY)

```typescript
const ROUTER = {
  SITE: "/",
  LOGIN: "/login",

  // Admin routes (OWNER, ADMIN)
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_GAMES: "/admin/games",
  ADMIN_BALANCES: "/admin/balances",
  ADMIN_TRANSACTIONS: "/admin/transactions",
  ADMIN_REPORTS: "/admin/reports",
  EDIT_USER: "/admin/users/edit-user",
  CREATE_USER: "/admin/users/create-user",
  CREATE_ADMIN: "/admin/users/create-admin",
  CREATE_CASHIER: "/admin/users/create-cashier",

  // Cashier routes
  CASHIER_DASHBOARD: "/cashier/dashboard",
  CASHIER_SELL_CHIPS: "/cashier/sell",
  CASHIER_TRANSACTIONS: "/cashier/transactions",

  // Player routes
  USER_DASHBOARD: "/user/dashboard",
  USER_BETS: "/user/bets",
  USER_PROFILE: "/user/profile",
  USER_TRANSACTIONS: "/user/transactions",
  USER_SETTINGS: "/user/settings",
}

export default ROUTER
```

---

### Step 7: Update Admin Users Page

Replace mock data with API calls.

**File:** `web/app/admin/users/page.tsx` (MODIFY)

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUsers } from "@/hooks/useUsers"
import { Search, Edit, Ban, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserStatus } from "helper"
import ROUTER from "@/routes"

export default function AdminUsers() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const { users, loading, blockUser, unblockUser } = useUsers()

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    try {
      if (currentStatus === UserStatus.ACTIVE) {
        await blockUser(userId)
      } else {
        await unblockUser(userId)
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  const handleEditUser = (userId: string) => {
    router.push(`${ROUTER.EDIT_USER}?id=${userId}`)
  }

  if (loading) {
    return (
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8">Cargando usuarios...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Lista de Usuarios">
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
          <div className="col-span-2">Usuario</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-1">Rol</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Registro</div>
          <div className="col-span-2">Última Act.</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-12 gap-4 p-4 transition-colors">
              <div className="col-span-2">
                <div className="font-semibold">{user.username}</div>
              </div>
              <div className="col-span-3">
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
              <div className="col-span-1">
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <div className="col-span-1">
                <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                  {user.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="col-span-1">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user.id)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={user.status === UserStatus.ACTIVE ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                  >
                    {user.status === UserStatus.ACTIVE ?
                      <Ban className="h-3 w-3" /> :
                      <CheckCircle className="h-3 w-3" />
                    }
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No se encontraron usuarios que coincidan con la búsqueda.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
```

---

### Step 8: Update Admin Balances Page

Replace mock data with chip operations from the API.

**File:** `web/app/admin/balances/page.tsx` (MODIFY)

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUsers } from "@/hooks/useUsers"
import { useChips } from "@/hooks/useChips"
import { Plus, Minus, Search, DollarSign } from "lucide-react"
import { UserStatus } from "helper"
import type { User } from "helper"

export default function AdminBalances() {
  const { users, loading: usersLoading } = useUsers()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [userBalances, setUserBalances] = useState<Record<string, number>>({})

  // Load balances for all users
  useEffect(() => {
    const loadBalances = async () => {
      const balances: Record<string, number> = {}

      for (const user of users) {
        try {
          const response = await apiService.get<Balance>(`/chips/balance/${user.id}`)
          if (response.success && response.data) {
            balances[user.id] = response.data.chipBalance
          }
        } catch (error) {
          console.error(`Failed to load balance for user ${user.id}:`, error)
        }
      }

      setUserBalances(balances)
    }

    if (users.length > 0) {
      loadBalances()
    }
  }, [users])

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBalanceAdjustment = async (type: "add" | "subtract") => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) return

    const amount = Number.parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      // Note: You'll need to create an adjustment endpoint in the API
      // For now, this is a placeholder
      console.log('Balance adjustment:', { type, amount, reason: adjustmentReason })

      // Reset form
      setAdjustmentAmount("")
      setAdjustmentReason("")
      setSelectedUser(null)

      // Reload balances
      // You'll need to implement this based on your API
    } catch (error) {
      console.error('Failed to adjust balance:', error)
    }
  }

  const totalSystemBalance = Object.values(userBalances).reduce((sum, balance) => sum + balance, 0)

  if (usersLoading) {
    return (
      <DashboardLayout title="Gestión de Balances">
        <div className="text-center py-8">Cargando balances...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Gestión de Balances">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total Sistema</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSystemBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">en {users.length} cuentas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className={selectedUser?.id === user.id ? "ring-2 ring-blue-500" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{user.username}</h3>
                        <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{user.email}</p>
                      <p className="text-2xl font-bold text-green-600 mb-3">
                        ${(userBalances[user.id] || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant={selectedUser?.id === user.id ? "default" : "outline"}
                      onClick={() => setSelectedUser(user)}
                    >
                      {selectedUser?.id === user.id ? "Seleccionado" : "Seleccionar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Balance Adjustment Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ajustar Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium">Usuario seleccionado:</Label>
                    <p className="text-lg font-semibold">{selectedUser.username}</p>
                    <p className="text-sm text-gray-600">
                      Balance actual: ${(userBalances[selectedUser.id] || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="amount">Cantidad</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Motivo del ajuste</Label>
                    <Input
                      id="reason"
                      placeholder="Describe el motivo..."
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBalanceAdjustment("add")}
                      disabled={!adjustmentAmount || !adjustmentReason}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                    <Button
                      onClick={() => handleBalanceAdjustment("subtract")}
                      disabled={!adjustmentAmount || !adjustmentReason}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Restar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Selecciona un usuario para ajustar su balance
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
```

**Note:** You'll need to import `apiService` and `Balance` type at the top:

```typescript
import { apiService } from "@/services/api.service"
import type { Balance } from "helper"
```

---

## Required Changes by File

### Files to CREATE

1. ✅ `web/.env.local` - Environment configuration
2. ✅ `web/services/api.service.ts` - API service layer
3. ✅ `web/hooks/useUsers.ts` - Users data hook
4. ✅ `web/hooks/useChips.ts` - Chips data hook

### Files to MODIFY

1. ✅ `web/config/index.ts` - Add API_URL configuration
2. ✅ `web/contexts/auth-context.tsx` - Replace mock auth with API calls
3. ✅ `web/feature/login/hook/useLogin.ts` - Update login logic
4. ✅ `web/routes/index.ts` - Add new routes for cashier and update existing
5. ✅ `web/app/admin/users/page.tsx` - Use real API data
6. ✅ `web/app/admin/balances/page.tsx` - Use real API data
7. `web/app/admin/transactions/page.tsx` - Use chip movements API
8. `web/app/user/dashboard/page.tsx` - Show real user data
9. `web/app/user/transactions/page.tsx` - Show real transactions

### Files to DEPRECATE (Optional)

- `web/lib/mock-data.ts` - Keep for reference but don't use in production code

---

## Environment Configuration

### Development Environment

```bash
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production Environment

```bash
# web/.env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Testing the Integration

### 1. Start Both Servers

```bash
# Terminal 1 - API
cd api
pnpm dev

# Terminal 2 - Web
cd web
pnpm dev
```

### 2. Test Authentication

1. Navigate to `http://localhost:3000/login`
2. Try logging in with test credentials
3. Verify redirect to dashboard
4. Check that user data is loaded from API
5. Test logout functionality

### 3. Test User Management

1. Navigate to `/admin/users`
2. Verify users list loads from API
3. Test search functionality
4. Test block/unblock user
5. Test create new user

### 4. Test Balance Management

1. Navigate to `/admin/balances`
2. Verify balances load from API
3. Test balance adjustments (when implemented)

### 5. Verify Token Refresh

1. Wait for access token to expire (15 minutes)
2. Make an API call
3. Verify automatic token refresh works
4. Verify you're not logged out

---

## Troubleshooting

### CORS Errors

If you see CORS errors in the console:

1. Verify API is running
2. Check API CORS configuration allows `http://localhost:3000`
3. Verify `api/src/server.ts` has correct CORS setup

### Authentication Not Working

1. Check API is accessible: `curl http://localhost:3001/api/health`
2. Verify login credentials are correct
3. Check browser console for error messages
4. Verify `NEXT_PUBLIC_API_URL` is set correctly
5. Check localStorage for tokens

### Data Not Loading

1. Open browser DevTools → Network tab
2. Check API responses
3. Verify authentication token is being sent
4. Check API server logs for errors

### Type Errors

1. Ensure `helper` package is installed: `pnpm install`
2. Rebuild helper package: `cd helper && pnpm build`
3. Restart TypeScript server in your editor

### Token Expiration Issues

1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Login again
4. Check that refresh token is being stored

---

## Migration Checklist

Use this checklist to track your integration progress:

- [ ] Environment variables configured
- [ ] API service created (`services/api.service.ts`)
- [ ] Auth context updated to use API
- [ ] Login hook updated
- [ ] User hooks created
- [ ] Chip hooks created
- [ ] Routes updated
- [ ] Admin users page updated
- [ ] Admin balances page updated
- [ ] Admin transactions page updated
- [ ] User dashboard updated
- [ ] User transactions updated
- [ ] Tested login flow
- [ ] Tested user management
- [ ] Tested balance operations
- [ ] Tested token refresh
- [ ] Tested error handling
- [ ] Production environment configured

---

## Next Steps

After completing the integration:

1. **Remove Mock Data** - Delete or comment out unused mock data
2. **Add Error Boundaries** - Implement React Error Boundaries for better error handling
3. **Add Loading States** - Improve UX with skeleton loaders
4. **Add Toast Notifications** - Use sonner for success/error messages
5. **Implement Cashier Pages** - Create dedicated cashier routes and pages
6. **Add Form Validation** - Use Zod schemas from `helper` package
7. **Add Tests** - Write integration tests for critical flows
8. **Optimize Performance** - Implement data caching and pagination
9. **Security Audit** - Review token storage and API communication

---

## Additional Resources

- API Integration Guide: `api/INTEGRATION.md`
- Helper Package Types: `helper/src/types/`
- API Swagger Docs: `http://localhost:3001/doc`

---

**Last Updated:** 2025-11-29
