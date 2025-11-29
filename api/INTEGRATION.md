# API Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Environment](#base-url--environment)
3. [Authentication](#authentication)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Chips](#chips-endpoints)
7. [TypeScript Types](#typescript-types)
8. [Frontend Examples](#frontend-examples)

---

## Overview

This is a RESTful API built with Express.js and TypeScript for managing a casino platform with hierarchical user management, chip transactions, and cashier operations.

**Tech Stack:**
- Framework: Express.js
- Database: PostgreSQL (Supabase)
- Authentication: JWT with refresh tokens
- Validation: Zod

---

## Base URL & Environment

```bash
# Development
API_URL=http://localhost:3001

# Production
API_URL=https://your-production-api.com
```

All endpoints are prefixed with `/api`:
```
http://localhost:3001/api/{endpoint}
```

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with access and refresh tokens.

### Authentication Flow

1. **Login** with credentials to receive tokens
2. **Include access token** in subsequent requests via `Authorization` header
3. **Refresh token** when access token expires
4. **Logout** to invalidate tokens

### Request Headers

```typescript
headers: {
  'Authorization': 'Bearer {accessToken}',
  'Content-Type': 'application/json'
}
```

### Token Storage

Store tokens securely:
- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)

**Recommended storage:**
- HttpOnly cookies (preferred)
- Secure localStorage with encryption

---

## Response Format

All API responses follow a standardized format:

### Success Response

```typescript
{
  "success": true,
  "data": T, // Response data
  "meta": { // Optional pagination metadata
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No token provided or invalid token |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_CREDENTIALS` | 401 | Wrong username or password |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `INSUFFICIENT_PERMISSIONS` | 403 | User role cannot perform this action |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INVALID_INPUT` | 400 | Input doesn't meet requirements |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `INSUFFICIENT_BALANCE` | 400 | Not enough chips for transaction |
| `INVALID_HIERARCHY` | 400 | Invalid user hierarchy operation |
| `USER_BLOCKED` | 403 | User account is blocked |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/users/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await response.json();

  if (!data.success) {
    switch (data.error.code) {
      case 'UNAUTHORIZED':
      case 'TOKEN_EXPIRED':
        // Refresh token or redirect to login
        break;
      case 'VALIDATION_ERROR':
        // Show validation errors
        console.error(data.error.details);
        break;
      default:
        // Generic error handling
        console.error(data.error.message);
    }
  }
} catch (error) {
  // Network or parsing error
  console.error('Request failed:', error);
}
```

---

## Endpoints

### Health Check

#### `GET /api/health`

Check if the API is running.

**Authentication:** Not required

**Response:**
```typescript
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-11-29T10:30:00.000Z",
    "uptime": 3600 // seconds
  }
}
```

---

### Authentication Endpoints

#### `POST /api/auth/login`

Authenticate user and receive tokens.

**Authentication:** Not required

**Request Body:**
```typescript
{
  "username": string, // min: 3, max: 50
  "password": string  // min: 8, max: 100
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "ADMIN",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

---

#### `POST /api/auth/refresh`

Refresh access token using refresh token.

**Authentication:** Not required

**Request Body:**
```typescript
{
  "refreshToken": string
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

#### `POST /api/auth/logout`

Logout current session.

**Authentication:** Optional (can work without token)

**Response:**
```typescript
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

#### `POST /api/auth/logout-all`

Logout from all sessions.

**Authentication:** Required

**Response:**
```typescript
{
  "success": true,
  "data": {
    "message": "All sessions terminated"
  }
}
```

---

#### `POST /api/auth/change-password`

Change current user's password.

**Authentication:** Required

**Request Body:**
```typescript
{
  "currentPassword": string, // min: 8
  "newPassword": string,     // min: 8, max: 100
  "confirmPassword": string  // must match newPassword
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

#### `GET /api/auth/me`

Get current authenticated user information.

**Authentication:** Required

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "ADMIN",
    "status": "ACTIVE",
    "parentUserId": "uuid" | null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### Users Endpoints

All user endpoints require authentication.

#### `POST /api/users`

Create a new user.

**Authentication:** Required

**Request Body:**
```typescript
{
  "parentUserId": string | undefined, // UUID, optional
  "role": "OWNER" | "ADMIN" | "CASHIER" | "PLAYER",
  "username": string, // min: 3, max: 50
  "email": string,    // valid email format
  "password": string  // min: 8, max: 100
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "parentUserId": "uuid" | null,
    "role": "CASHIER",
    "username": "cashier_01",
    "email": "cashier@example.com",
    "status": "ACTIVE",
    "createdAt": "2025-11-29T10:00:00.000Z",
    "updatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `GET /api/users/:id`

Get user by ID.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "ADMIN",
    "status": "ACTIVE",
    "parentUserId": "uuid" | null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### `PATCH /api/users/:id`

Update user information.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Request Body:**
```typescript
{
  "username": string | undefined, // min: 3, max: 50
  "email": string | undefined,    // valid email
  "status": "ACTIVE" | "BLOCKED" | "PENDING" | undefined
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "updated_username",
    "email": "updated@example.com",
    "role": "ADMIN",
    "status": "ACTIVE",
    "parentUserId": "uuid" | null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `GET /api/users/me/children`

Get direct children of current user.

**Authentication:** Required

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "child_user_1",
      "email": "child1@example.com",
      "role": "CASHIER",
      "status": "ACTIVE",
      "parentUserId": "current_user_uuid",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/users/me/tree`

Get complete user hierarchy tree for current user.

**Authentication:** Required

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin_user",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "parentUserId": null,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    },
    "balance": {
      "id": "uuid",
      "userId": "uuid",
      "chipBalance": 10000,
      "lastUpdatedAt": "2025-11-29T10:00:00.000Z"
    },
    "children": [
      {
        "user": { /* User object */ },
        "balance": { /* Balance object */ },
        "children": [ /* Nested children */ ]
      }
    ]
  }
}
```

---

#### `GET /api/users/:id/children`

Get direct children of a specific user.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Response:** Same as `/api/users/me/children`

---

#### `GET /api/users/:id/tree`

Get complete hierarchy tree for a specific user.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Response:** Same as `/api/users/me/tree`

---

#### `POST /api/users/:id/block`

Block a user.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "blocked_user",
    "email": "blocked@example.com",
    "role": "PLAYER",
    "status": "BLOCKED",
    "parentUserId": "uuid",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `POST /api/users/:id/unblock`

Unblock a user.

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "unblocked_user",
    "email": "unblocked@example.com",
    "role": "PLAYER",
    "status": "ACTIVE",
    "parentUserId": "uuid",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `POST /api/users/:id/reset-password`

Reset a user's password (admin function).

**Authentication:** Required

**URL Parameters:**
- `id`: User UUID

**Request Body:**
```typescript
{
  "userId": string,     // UUID (must match :id param)
  "newPassword": string // min: 8, max: 100
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

### Chips Endpoints

All chip endpoints require authentication.

#### `POST /api/chips/sell`

Sell chips to a player.

**Authentication:** Required

**Request Body:**
```typescript
{
  "playerId": string,        // UUID
  "amount": number,          // positive number
  "description": string | undefined
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "movement": {
      "id": "uuid",
      "userId": "player_uuid",
      "relatedUserId": "cashier_uuid",
      "type": "SELL_TO_PLAYER",
      "amount": 1000,
      "description": "Chip sale",
      "previousBalance": 5000,
      "newBalance": 6000,
      "createdAt": "2025-11-29T10:00:00.000Z"
    },
    "newBalance": 6000
  }
}
```

---

#### `POST /api/chips/prize`

Pay prize to a player (player wins).

**Authentication:** Required

**Request Body:**
```typescript
{
  "playerId": string,        // UUID
  "amount": number,          // positive number
  "description": string | undefined
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "movement": {
      "id": "uuid",
      "userId": "player_uuid",
      "relatedUserId": "cashier_uuid",
      "type": "PRIZE",
      "amount": 500,
      "description": "Game prize",
      "previousBalance": 6000,
      "newBalance": 6500,
      "createdAt": "2025-11-29T10:00:00.000Z"
    },
    "newBalance": 6500
  }
}
```

---

#### `POST /api/chips/loss`

Register player loss.

**Authentication:** Required

**Request Body:**
```typescript
{
  "playerId": string,        // UUID
  "amount": number,          // positive number
  "description": string | undefined
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "movement": {
      "id": "uuid",
      "userId": "player_uuid",
      "relatedUserId": "cashier_uuid",
      "type": "LOSS",
      "amount": 200,
      "description": "Game loss",
      "previousBalance": 6500,
      "newBalance": 6300,
      "createdAt": "2025-11-29T10:00:00.000Z"
    },
    "newBalance": 6300
  }
}
```

---

#### `POST /api/chips/withdraw`

Withdraw chips from a player.

**Authentication:** Required

**Request Body:**
```typescript
{
  "playerId": string,        // UUID
  "amount": number,          // positive number
  "description": string | undefined
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "movement": {
      "id": "uuid",
      "userId": "player_uuid",
      "relatedUserId": "cashier_uuid",
      "type": "WITHDRAWAL",
      "amount": 1000,
      "description": "Chip withdrawal",
      "previousBalance": 6300,
      "newBalance": 5300,
      "createdAt": "2025-11-29T10:00:00.000Z"
    },
    "newBalance": 5300
  }
}
```

---

#### `GET /api/chips/my-balance`

Get current user's chip balance.

**Authentication:** Required

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "chipBalance": 10000,
    "lastUpdatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `GET /api/chips/balance/:userId`

Get chip balance for a specific user.

**Authentication:** Required

**URL Parameters:**
- `userId`: User UUID

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "chipBalance": 5300,
    "lastUpdatedAt": "2025-11-29T10:00:00.000Z"
  }
}
```

---

#### `GET /api/chips/movements/:userId`

Get chip movement history for a user.

**Authentication:** Required

**URL Parameters:**
- `userId`: User UUID

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `sortBy`: string (default: 'createdAt')
- `sortOrder`: 'asc' | 'desc' (default: 'desc')

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "relatedUserId": "uuid" | null,
      "type": "SELL_TO_PLAYER",
      "amount": 1000,
      "description": "Chip sale",
      "previousBalance": 5000,
      "newBalance": 6000,
      "createdAt": "2025-11-29T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

## TypeScript Types

Import types from the `helper` package:

```typescript
import {
  // User Types
  User,
  UserRole,
  UserStatus,
  CreateUserDto,
  UpdateUserDto,

  // Chip Types
  Balance,
  ChipMovement,
  ChipMovementType,

  // API Types
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  ErrorCode,

  // Auth Types
  AuthTokens,
  JwtPayload,

  // Tree Types
  UserTreeNode
} from 'helper';
```

### User Roles

```typescript
enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  PLAYER = 'PLAYER'
}
```

### User Status

```typescript
enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING'
}
```

### Chip Movement Types

```typescript
enum ChipMovementType {
  SELL_TO_PLAYER = 'SELL_TO_PLAYER',
  BUY_FROM_ADMIN = 'BUY_FROM_ADMIN',
  PRIZE = 'PRIZE',
  LOSS = 'LOSS',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
  RECOVERY = 'RECOVERY',
  ADJUSTMENT = 'ADJUSTMENT',
  PANEL_ASSIGNMENT = 'PANEL_ASSIGNMENT',
  PANEL_SALE = 'PANEL_SALE'
}
```

---

## Frontend Examples

### API Service Class

```typescript
// services/api.service.ts
import type { ApiResponse } from 'helper';

class ApiService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Auto-refresh token on 401
    if (!data.success && data.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry original request
        return this.request<T>(endpoint, options);
      }
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
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

    if (response.success) {
      this.setAccessToken(response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const response = await this.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    });

    if (response.success) {
      this.setAccessToken(response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      return true;
    }

    return false;
  }

  async logout() {
    await this.post('/auth/logout');
    this.setAccessToken(null);
    localStorage.removeItem('refreshToken');
  }
}

export const apiService = new ApiService();
```

---

### React Hook Example

```typescript
// hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { User, ApiResponse } from 'helper';

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

    const response = await apiService.get<User[]>('/users/me/children');

    if (response.success) {
      setUsers(response.data);
    } else {
      setError(response.error.message);
    }

    setLoading(false);
  };

  const createUser = async (userData: CreateUserDto) => {
    const response = await apiService.post<User>('/users', userData);

    if (response.success) {
      setUsers([...users, response.data]);
    }

    return response;
  };

  const blockUser = async (userId: string) => {
    const response = await apiService.post<User>(`/users/${userId}/block`);

    if (response.success) {
      setUsers(users.map(u => u.id === userId ? response.data : u));
    }

    return response;
  };

  return {
    users,
    loading,
    error,
    createUser,
    blockUser,
    reload: loadUsers,
  };
}
```

---

### Chip Operations Example

```typescript
// hooks/useChips.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { Balance, ChipMovement, ApiResponse, PaginationMeta } from 'helper';

export function useChips(userId?: string) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [movements, setMovements] = useState<ChipMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = async () => {
    const endpoint = userId
      ? `/chips/balance/${userId}`
      : '/chips/my-balance';

    const response = await apiService.get<Balance>(endpoint);

    if (response.success) {
      setBalance(response.data);
    }
  };

  const loadMovements = async (page = 1, limit = 10) => {
    if (!userId) return;

    setLoading(true);

    const response = await apiService.get<ChipMovement[]>(
      `/chips/movements/${userId}?page=${page}&limit=${limit}`
    );

    if (response.success) {
      setMovements(response.data);
      setMeta(response.meta || null);
    }

    setLoading(false);
  };

  const sellChips = async (playerId: string, amount: number, description?: string) => {
    const response = await apiService.post('/chips/sell', {
      playerId,
      amount,
      description,
    });

    if (response.success) {
      await loadBalance();
      await loadMovements();
    }

    return response;
  };

  const payPrize = async (playerId: string, amount: number, description?: string) => {
    const response = await apiService.post('/chips/prize', {
      playerId,
      amount,
      description,
    });

    if (response.success) {
      await loadBalance();
      await loadMovements();
    }

    return response;
  };

  const registerLoss = async (playerId: string, amount: number, description?: string) => {
    const response = await apiService.post('/chips/loss', {
      playerId,
      amount,
      description,
    });

    if (response.success) {
      await loadBalance();
      await loadMovements();
    }

    return response;
  };

  const withdraw = async (playerId: string, amount: number, description?: string) => {
    const response = await apiService.post('/chips/withdraw', {
      playerId,
      amount,
      description,
    });

    if (response.success) {
      await loadBalance();
      await loadMovements();
    }

    return response;
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

### Component Example

```typescript
// components/UsersList.tsx
import { useUsers } from '@/hooks/useUsers';
import { UserRole } from 'helper';

export function UsersList() {
  const { users, loading, error, createUser, blockUser } = useUsers();

  const handleCreateCashier = async () => {
    const result = await createUser({
      role: UserRole.CASHIER,
      username: 'new_cashier',
      email: 'cashier@example.com',
      password: 'SecurePass123',
    });

    if (result.success) {
      console.log('Cashier created:', result.data);
    } else {
      console.error('Error:', result.error.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={handleCreateCashier}>Create Cashier</button>

      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.username} - {user.role} - {user.status}
            {user.status === 'ACTIVE' && (
              <button onClick={() => blockUser(user.id)}>Block</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Additional Resources

- **Swagger Documentation**: Available at `/doc` when API is running
- **Type Definitions**: Check the `helper` package for complete TypeScript types
- **Validation Schemas**: Located in `helper/src/validators/`

---

## Support

For issues or questions:
1. Check the Swagger documentation at `/doc`
2. Review error codes in the Error Handling section
3. Verify request/response formats match the examples
4. Ensure proper authentication headers are included

---

**Last Updated:** 2025-11-29
