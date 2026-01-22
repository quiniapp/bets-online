# Complete Integration Guide: Casino Betting Platform

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [Installation](#installation)
5. [Database Migrations](#database-migrations)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Game Simulation Logic](#game-simulation-logic)
8. [Frontend Integration](#frontend-integration)
9. [Role-Based Permissions](#role-based-permissions)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Guide](#deployment-guide)
12. [Verification Checklist](#verification-checklist)
13. [Troubleshooting](#troubleshooting)
14. [API Response Format](#api-response-format)
15. [Security Considerations](#security-considerations)

---

## Overview

This is a complete casino betting platform with hierarchical user management, chip transactions, game simulation, and comprehensive accounting. The system consists of three main components:

- **API**: Express.js REST API with PostgreSQL database
- **Web**: Next.js 15 frontend with React 19
- **Helper**: Shared TypeScript types, validators, and utilities

**Tech Stack:**
- Backend: Node.js 20+, Express.js, TypeScript, Sequelize ORM, PostgreSQL (Supabase)
- Frontend: Next.js 15/16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Auth: JWT with access & refresh tokens (15 min / 7 days)
- Validation: Zod schemas
- Documentation: Swagger UI at `/doc`

**Key Features:**
- 4-level user hierarchy: OWNER → ADMIN → CASHIER → PLAYER
- Complete chip transaction system with audit trail
- Probabilistic game simulation using house edge
- Real-time balance updates
- Comprehensive bet history and statistics
- Admin dashboard with metrics
- Role-based permissions enforced at domain layer

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Admin UI   │  │  Cashier UI  │  │   Player UI  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│  ┌──────┴─────────────────┴──────────────────┴──────┐       │
│  │         React Hooks + API Service                 │       │
│  └────────────────────────┬──────────────────────────┘       │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP + JWT
┌─────────────────────────────┼────────────────────────────────┐
│                    API Backend (Express)                      │
│  ┌────────────────────────┬┴──────────────────────────┐      │
│  │        Routes          │     Middleware             │      │
│  │  (Swagger Documented)  │  (Auth, Validation, CORS)  │      │
│  └────────┬───────────────┴────────────────────────────┘      │
│           │                                                    │
│  ┌────────┴────────────────────────────────────────────┐      │
│  │              Controllers Layer                      │      │
│  └────────┬────────────────────────────────────────────┘      │
│           │                                                    │
│  ┌────────┴────────────────────────────────────────────┐      │
│  │         Domain Layer (Business Logic)               │      │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │      │
│  │  │   Users    │  │   Chips    │  │    Games     │  │      │
│  │  │  Domain    │  │  Domain    │  │   Domain     │  │      │
│  │  └────────────┘  └────────────┘  └──────────────┘  │      │
│  │  ┌────────────┐  ┌────────────────────────────────┐ │      │
│  │  │   Bets     │  │   Game Simulation Service      │ │      │
│  │  │  Domain    │  │   (House Edge Algorithm)       │ │      │
│  │  └────────────┘  └────────────────────────────────┘ │      │
│  └────────┬────────────────────────────────────────────┘      │
│           │                                                    │
│  ┌────────┴────────────────────────────────────────────┐      │
│  │           Repository Layer (Data Access)            │      │
│  └────────┬────────────────────────────────────────────┘      │
└───────────┼────────────────────────────────────────────────────┘
            │ Sequelize ORM
┌───────────┼────────────────────────────────────────────────────┐
│           ▼                                                     │
│     PostgreSQL Database (Supabase)                             │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  users, balances, chip_movements, games, bets,       │     │
│  │  sessions, audit_logs                                 │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Authentication Flow:**
1. User submits credentials → API validates → Returns access token (15 min) + refresh token (7 days)
2. Frontend stores tokens in localStorage
3. API requests include `Authorization: Bearer {accessToken}`
4. On 401 TOKEN_EXPIRED → Automatic refresh → Retry original request
5. On refresh failure → Redirect to login

**Betting Flow:**
1. Player selects game and amount → Frontend validates
2. API validates user, game, balance → Starts transaction
3. Deduct bet amount (LOSS chip movement) → Updates balance
4. Run game simulation with house edge → Determine win/lose
5. If win: Calculate payout with multiplier → Credit balance (PRIZE movement)
6. Create bet record with result → Commit transaction
7. Return result to frontend → Update UI + balance

---

## Environment Setup

### API Environment Variables

Create `api/.env`:

```bash
# Node Environment
NODE_ENV=development

# Server
PORT=3001

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration
JWT_SECRET=your-32-char-secret-key-change-this
JWT_REFRESH_SECRET=your-32-char-refresh-secret-key
SESSION_SECRET=your-32-char-session-secret-key

# Token Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Initial Admin User
ADMIN_EMAIL=admin@casino.com
ADMIN_PASSWORD=change-this-password
ADMIN_USERNAME=owner

# Logging
LOG_LEVEL=info

# BCrypt rounds
BCRYPT_ROUNDS=10
```

**Generate secure secrets:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Web Environment Variables

Create `web/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# NextAuth (if using NextAuth later)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Other
NEXT_PUBLIC_APP_NAME=Casino Betting Platform
```

### Production Environment

**API (`api/.env.production`):**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...  # Production database
JWT_SECRET=production-secret-32-chars-minimum
JWT_REFRESH_SECRET=production-refresh-secret
SESSION_SECRET=production-session-secret
ALLOWED_ORIGINS=https://your-domain.com
```

**Web (`web/.env.production`):**
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Installation

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 15 (or Supabase account)
- Git

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd bets-online
```

### Step 2: Install Dependencies

```bash
# Install all workspace dependencies
npm install

# This installs dependencies for api/, web/, and helper/
```

### Step 3: Build Helper Package

```bash
cd helper
npm run build
cd ..
```

### Step 4: Configure Environment

```bash
# Copy environment templates
cp api/.env.example api/.env
cp web/.env.example web/.env.local

# Edit api/.env with your database credentials
# Edit web/.env.local with your API URL
```

### Step 5: Database Setup

See [Database Migrations](#database-migrations) section below.

### Step 6: Run Development Servers

```bash
# From project root
npm run dev

# Or individually:
npm run api:dev  # API on http://localhost:3001
npm run web:dev  # Web on http://localhost:3000
```

---

## Database Migrations

### Option 1: Using Sequelize CLI

```bash
cd api

# Run all migrations
npx sequelize-cli db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all
```

### Option 2: Using Supabase CLI

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Manual Execution

```bash
# Connect to your database
psql $DATABASE_URL

# Run migrations in order
\i api/src/persistence/migrations/20250109000001-create-games.js
\i api/src/persistence/migrations/20250109000002-create-bets.js
```

### Migration Files

The system includes the following migrations:

1. **Initial Schema** - Users, balances, chip movements, sessions
2. **20250109000001-create-games.js** - Games table
3. **20250109000002-create-bets.js** - Bets table

### Seed Data (Optional)

```bash
cd api
npx sequelize-cli db:seed:all
```

This creates:
- Initial owner user (from env variables)
- Sample games (Roulette, Blackjack, Poker)

---

## API Endpoints Reference

### Base URL

```
Development: http://localhost:3001/api
Production:  https://api.your-domain.com/api
```

### Complete Endpoint List (41 endpoints)

#### Health Check (1)
- `GET /health` - Check API status

#### Authentication (6)
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions
- `POST /auth/change-password` - Change current user password
- `GET /auth/me` - Get current user info

#### Users (11)
- `POST /users` - Create new user
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `GET /users/me/children` - Get my direct children
- `GET /users/me/tree` - Get my complete hierarchy tree
- `GET /users/:id/children` - Get user's children
- `GET /users/:id/tree` - Get user's hierarchy tree
- `POST /users/:id/block` - Block user
- `POST /users/:id/unblock` - Unblock user
- `POST /users/:id/reset-password` - Reset user password (admin)
- `DELETE /users/:id` - Delete user (soft delete)

#### Chips (7)
- `POST /chips/sell` - Sell chips to player
- `POST /chips/prize` - Pay prize to player
- `POST /chips/loss` - Register player loss
- `POST /chips/withdraw` - Withdraw chips from player
- `GET /chips/my-balance` - Get my balance
- `GET /chips/balance/:userId` - Get user balance
- `GET /chips/movements/:userId` - Get user chip movement history

#### Games (6)
- `GET /games` - List all games (filter by active)
- `GET /games/:id` - Get game by ID
- `POST /games` - Create new game (OWNER/ADMIN only)
- `PATCH /games/:id` - Update game (OWNER/ADMIN only)
- `POST /games/:id/toggle-status` - Toggle game active/inactive
- `DELETE /games/:id` - Delete game (soft delete)

#### Bets (10)
- `POST /bets` - Place a bet (includes simulation)
- `GET /bets/:id` - Get bet by ID
- `GET /bets/my-history` - Get my bet history
- `GET /bets/my-statistics` - Get my bet statistics
- `GET /bets/history/:userId` - Get user bet history (with permissions)
- `GET /bets/statistics/:userId` - Get user statistics (with permissions)
- `GET /bets/game/:gameId` - Get bets for a game
- `GET /bets/recent` - Get recent bets (admin)
- `PATCH /bets/:id/cancel` - Cancel bet (admin only)
- `GET /bets/leaderboard` - Get top winners (admin)

### Detailed Endpoint Documentation

#### POST /bets - Place Bet

**Request:**
```json
{
  "gameId": "uuid",
  "amount": 50.00
}
```

**Response (Win):**
```json
{
  "success": true,
  "data": {
    "bet": {
      "id": "uuid",
      "userId": "uuid",
      "gameId": "uuid",
      "amount": 50.00,
      "status": "WON",
      "multiplier": 2.5,
      "payout": 125.00,
      "resultData": {
        "spin": 17,
        "color": "red",
        "winType": "number"
      },
      "createdAt": "2025-01-09T10:00:00.000Z",
      "settledAt": "2025-01-09T10:00:01.000Z"
    },
    "newBalance": 1175.00,
    "message": "Bet placed successfully"
  }
}
```

**Response (Loss):**
```json
{
  "success": true,
  "data": {
    "bet": {
      "id": "uuid",
      "userId": "uuid",
      "gameId": "uuid",
      "amount": 50.00,
      "status": "LOST",
      "multiplier": null,
      "payout": null,
      "resultData": {
        "spin": 0,
        "color": "green",
        "winType": null
      },
      "createdAt": "2025-01-09T10:00:00.000Z",
      "settledAt": "2025-01-09T10:00:01.000Z"
    },
    "newBalance": 950.00,
    "message": "Bet placed successfully"
  }
}
```

#### GET /bets/my-statistics - Get User Statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBets": 150,
    "totalWagered": 7500.00,
    "totalWon": 4200.00,
    "totalLost": 3300.00,
    "netProfit": 900.00,
    "winRate": 45.33,
    "averageBet": 50.00,
    "biggestWin": 500.00,
    "biggestLoss": 100.00,
    "currentStreak": {
      "type": "win",
      "count": 3
    },
    "favoriteGame": {
      "id": "uuid",
      "name": "Roulette",
      "betsCount": 75
    }
  }
}
```

#### POST /games - Create Game

**Request:**
```json
{
  "name": "Roulette",
  "description": "Classic European Roulette",
  "minBet": 1.00,
  "maxBet": 1000.00,
  "houseEdge": 2.7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Roulette",
    "description": "Classic European Roulette",
    "isActive": true,
    "minBet": 1.00,
    "maxBet": 1000.00,
    "houseEdge": 2.7,
    "providerId": null,
    "createdAt": "2025-01-09T10:00:00.000Z",
    "updatedAt": "2025-01-09T10:00:00.000Z"
  }
}
```

#### GET /chips/movements/:userId - Get Chip Movements

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `sortBy` (default: 'createdAt')
- `sortOrder` ('asc' | 'desc', default: 'desc')
- `type` (optional filter by ChipMovementType)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "relatedUserId": "uuid",
      "type": "SELL_TO_PLAYER",
      "amount": 1000.00,
      "description": "Chip purchase",
      "previousBalance": 0.00,
      "newBalance": 1000.00,
      "createdAt": "2025-01-09T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "relatedUserId": null,
      "type": "LOSS",
      "amount": -50.00,
      "description": "Bet on Roulette",
      "previousBalance": 1000.00,
      "newBalance": 950.00,
      "createdAt": "2025-01-09T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

For complete API documentation, visit **Swagger UI** at `http://localhost:3001/doc` when the API is running.

---

## Game Simulation Logic

### House Edge Algorithm

The system uses a probabilistic simulation based on house edge to determine bet outcomes fairly.

**Formula:**
```typescript
Player Win Probability = (100 - houseEdge) / 100

Example:
- House Edge 0%  → 50% win rate (fair coin flip)
- House Edge 2.5% → 48.75% win rate
- House Edge 5%  → 47.5% win rate
```

**Implementation:**
```typescript
// api/src/services/game-simulation.service.ts

simulateGameRound(game: Game): SimulationResult {
  // Calculate win probability from house edge
  const winProbability = (100 - game.houseEdge) / 100;

  // Generate random number (0-1)
  const randomValue = Math.random();

  // Determine if player wins
  const isWin = randomValue < winProbability;

  if (isWin) {
    // Calculate multiplier based on house edge
    // Higher house edge = potential for higher multipliers
    const baseMultiplier = 1 + (game.houseEdge / 10);
    const randomFactor = 1.2 + Math.random() * 1.8;
    const multiplier = Math.round(baseMultiplier * randomFactor * 100) / 100;

    // Generate game-specific result data
    const resultData = this.generateResultData(game, true);

    return {
      isWin: true,
      multiplier,
      resultData
    };
  }

  // Player loses
  const resultData = this.generateResultData(game, false);
  return {
    isWin: false,
    multiplier: 0,
    resultData
  };
}
```

### Multiplier Calculation

**Multiplier Ranges by House Edge:**
- 0-2%: 1.2x - 3.0x
- 2-4%: 1.4x - 4.0x
- 4-6%: 1.6x - 5.0x
- 6-10%: 1.8x - 6.0x

### Result Data Examples

**Roulette:**
```json
{
  "spin": 17,
  "color": "red",
  "even": false,
  "winType": "number"
}
```

**Blackjack:**
```json
{
  "playerHand": ["A♠", "K♦"],
  "dealerHand": ["8♣", "7♥"],
  "playerTotal": 21,
  "dealerTotal": 15,
  "winType": "blackjack"
}
```

**Dice:**
```json
{
  "roll": [4, 6],
  "total": 10,
  "winType": "high"
}
```

### Atomic Transaction Flow

```typescript
// Simplified bet placement logic
async placeBet(userId: string, betData: CreateBetDto): Promise<BetResult> {
  const transaction = await sequelize.transaction();

  try {
    // 1. Validate user exists and is ACTIVE
    const user = await usersRepository.findById(userId, transaction);
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('User is blocked', 403);
    }

    // 2. Validate game exists and is active
    const game = await gamesRepository.findById(betData.gameId, transaction);
    if (!game.isActive) {
      throw new AppError('Game is not active', 400);
    }

    // 3. Validate bet amount within game limits
    if (betData.amount < game.minBet || betData.amount > game.maxBet) {
      throw new AppError('Bet amount out of range', 400);
    }

    // 4. Check user has sufficient balance
    const balance = await balancesRepository.getBalance(userId, transaction);
    if (balance.chipBalance < betData.amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // 5. Deduct bet amount (LOSS movement)
    const lossMovement = await chipsRepository.registerLoss(
      userId,
      betData.amount,
      `Bet on ${game.name}`,
      transaction
    );

    // 6. Run game simulation
    const simulationResult = gameSimulationService.simulateGameRound(game);

    // 7. Create bet record
    const bet = await betsRepository.create({
      userId,
      gameId: betData.gameId,
      amount: betData.amount,
      status: simulationResult.isWin ? BetStatus.WON : BetStatus.LOST,
      multiplier: simulationResult.multiplier || null,
      payout: simulationResult.isWin
        ? betData.amount * simulationResult.multiplier
        : null,
      resultData: simulationResult.resultData,
      settledAt: new Date()
    }, transaction);

    // 8. If win, credit payout (PRIZE movement)
    let prizeMovement = null;
    if (simulationResult.isWin) {
      prizeMovement = await chipsRepository.payPrize(
        userId,
        bet.payout!,
        `Prize from ${game.name}`,
        transaction
      );
    }

    // 9. Commit transaction
    await transaction.commit();

    // 10. Return result
    const newBalance = await balancesRepository.getBalance(userId);

    return {
      bet,
      movement: prizeMovement || lossMovement,
      newBalance: newBalance.chipBalance,
      message: SUCCESS_MESSAGES.BET_PLACED
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Key Points:**
- All database operations in a single transaction
- Bet amount deducted BEFORE simulation (prevents double deduction)
- If simulation wins, payout is credited
- If error occurs, entire transaction rolls back
- Balance always consistent with chip movements

---

## Frontend Integration

### API Service

The frontend uses a centralized API service for all HTTP requests:

```typescript
// web/services/api.service.ts

class ApiService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private accessToken: string | null = null;

  async request<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    // Add Authorization header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...options,
      headers
    });

    const data: ApiResponse<T> = await response.json();

    // Auto-refresh on token expiration
    if (!data.success && data.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options); // Retry
      }
    }

    return data;
  }

  async login(username: string, password: string) {
    const response = await this.post<{ user: User; tokens: AuthTokens }>(
      '/auth/login',
      { username, password }
    );

    if (response.success && response.data) {
      this.setAccessToken(response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const response = await this.post<AuthTokens>('/auth/refresh', { refreshToken });

    if (response.success && response.data) {
      this.setAccessToken(response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      return true;
    }

    return false;
  }
}

export const apiService = new ApiService();
```

### Custom Hooks

#### useGames

```typescript
// web/hooks/useGames.ts

export function useGames(activeOnly: boolean = false) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, [activeOnly]);

  const loadGames = async () => {
    const endpoint = activeOnly ? '/games?active=true' : '/games';
    const response = await apiService.get<Game[]>(endpoint);

    if (response.success && response.data) {
      setGames(response.data);
    }

    setLoading(false);
  };

  const createGame = async (gameData: CreateGameDto) => {
    const response = await apiService.post<{ game: Game }>('/games', gameData);

    if (response.success && response.data) {
      setGames([...games, response.data.game]);
    }

    return response;
  };

  const updateGame = async (gameId: string, updateData: UpdateGameDto) => {
    const response = await apiService.patch<{ game: Game }>(
      `/games/${gameId}`,
      updateData
    );

    if (response.success && response.data) {
      setGames(games.map(g => g.id === gameId ? response.data!.game : g));
    }

    return response;
  };

  const toggleGameStatus = async (gameId: string) => {
    const response = await apiService.post<{ game: Game; message: string }>(
      `/games/${gameId}/toggle-status`
    );

    if (response.success && response.data) {
      setGames(games.map(g => g.id === gameId ? response.data!.game : g));
    }

    return response;
  };

  return {
    games,
    loading,
    createGame,
    updateGame,
    toggleGameStatus,
    reload: loadGames
  };
}
```

#### useBets

```typescript
// web/hooks/useBets.ts

export function useBets(userId?: string) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [statistics, setStatistics] = useState<BetStatistics | null>(null);
  const [loading, setLoading] = useState(false);

  const placeBet = async (betData: CreateBetDto) => {
    const response = await apiService.post<{
      bet: Bet;
      newBalance: number
    }>('/bets', betData);

    if (response.success && response.data) {
      // Add bet to list optimistically
      setBets([response.data.bet, ...bets]);

      // Reload statistics
      if (statistics) loadStatistics();
    }

    return response;
  };

  const loadBets = async (params?: { limit?: number; page?: number }) => {
    setLoading(true);

    const endpoint = userId
      ? `/bets/history/${userId}`
      : '/bets/my-history';

    const query = new URLSearchParams({
      limit: String(params?.limit || 10),
      page: String(params?.page || 1)
    });

    const response = await apiService.get<Bet[]>(`${endpoint}?${query}`);

    if (response.success && response.data) {
      setBets(response.data);
    }

    setLoading(false);
  };

  const loadStatistics = async () => {
    const endpoint = userId
      ? `/bets/statistics/${userId}`
      : '/bets/my-statistics';

    const response = await apiService.get<BetStatistics>(endpoint);

    if (response.success && response.data) {
      setStatistics(response.data);
    }
  };

  return {
    bets,
    statistics,
    loading,
    placeBet,
    loadBets,
    loadStatistics
  };
}
```

### Component Example

```typescript
// web/app/user/games/page.tsx

export default function UserGamesPage() {
  const { games, loading: gamesLoading } = useGames(true); // Active only
  const { placeBet } = useBets();
  const { balance, loadBalance } = useChips();
  const { toast } = useToast();

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [betAmount, setBetAmount] = useState("");

  const handlePlaceBet = async () => {
    if (!selectedGame || !betAmount) return;

    try {
      const response = await placeBet({
        gameId: selectedGame.id,
        amount: parseFloat(betAmount)
      });

      if (response.success && response.data) {
        const { bet, newBalance } = response.data;

        // Update balance
        await loadBalance();

        // Show result
        const isWin = bet.status === "WON";
        toast({
          title: isWin ? "¡Ganaste!" : "Perdiste",
          description: isWin
            ? `Multiplicador: ${bet.multiplier?.toFixed(2)}x - Ganancia: $${bet.payout?.toFixed(2)}`
            : `Perdiste $${bet.amount.toFixed(2)}`,
          variant: isWin ? "default" : "destructive"
        });

        // Reset form
        setBetAmount("");
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "Error al realizar apuesta",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <h1>Juegos Disponibles</h1>

      {/* Balance Display */}
      <div className="mb-6">
        <p className="text-2xl font-bold">
          Balance: ${balance?.chipBalance.toFixed(2) || '0.00'}
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-3 gap-4">
        {games.map(game => (
          <Card key={game.id} onClick={() => setSelectedGame(game)}>
            <CardHeader>
              <CardTitle>{game.name}</CardTitle>
              <CardDescription>{game.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Min: ${game.minBet} - Max: ${game.maxBet}</p>
              <p>House Edge: {game.houseEdge}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bet Dialog */}
      {selectedGame && (
        <Dialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apostar en {selectedGame.name}</DialogTitle>
            </DialogHeader>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={selectedGame.minBet}
                max={selectedGame.maxBet}
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handlePlaceBet}>
                Apostar ${betAmount || '0.00'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

---

## Role-Based Permissions

### User Hierarchy

```
OWNER (Root User)
  └── Can create: ADMIN, CASHIER, PLAYER
  └── Full system access
  └── Can manage all users, games, balances

ADMIN (Created by OWNER or another ADMIN)
  └── Can create: ADMIN, CASHIER, PLAYER (within their tree)
  └── Manage users in their tree
  └── Manage games (create, edit, toggle)
  └── View all transactions in their tree

CASHIER (Created by OWNER or ADMIN)
  └── Can create: PLAYER only
  └── Sell chips to players
  └── View player balances
  └── Cannot manage games
  └── Limited transaction access

PLAYER (Created by any role)
  └── Cannot create users
  └── Can place bets
  └── View own balance
  └── View own bet history
  └── View own transactions
```

### Permission Enforcement

**Domain Layer Checks:**

```typescript
// api/src/domain/users/users.domain.ts

async createUser(requesterId: string, userData: CreateUserDto): Promise<User> {
  // Get requester
  const requester = await usersRepository.findById(requesterId);

  // Hierarchy validation
  if (userData.role === UserRole.OWNER) {
    throw new AppError('Cannot create OWNER users', 403);
  }

  // Role-specific restrictions
  if (requester.role === UserRole.CASHIER) {
    if (userData.role !== UserRole.PLAYER) {
      throw new AppError('Cashiers can only create PLAYER users', 403);
    }
  }

  // Set parent if not provided
  if (!userData.parentUserId) {
    userData.parentUserId = requesterId;
  }

  // Verify parent is in requester's tree
  const canManageUser = await this.canManageUser(requesterId, userData.parentUserId);
  if (!canManageUser) {
    throw new AppError('Cannot create user under this parent', 403);
  }

  return await usersRepository.create(userData);
}
```

### Frontend Route Protection

```typescript
// web/app/admin/layout.tsx

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && ![UserRole.OWNER, UserRole.ADMIN].includes(role)) {
      router.push('/');
    }
  }, [role, isLoading, router]);

  if (isLoading) return <LoadingSpinner />;

  if (![UserRole.OWNER, UserRole.ADMIN].includes(role)) {
    return null;
  }

  return <div>{children}</div>;
}
```

---

## Testing Strategy

### Backend Testing

**Unit Tests:**
```bash
cd api
npm test

# Test specific file
npm test -- users.domain.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

**Test Structure:**
```
api/src/
  ├── domain/
  │   ├── users/
  │   │   ├── users.domain.ts
  │   │   └── users.domain.test.ts
  │   ├── bets/
  │   │   ├── bets.domain.ts
  │   │   └── bets.domain.test.ts
```

**Example Test:**
```typescript
// api/src/domain/bets/bets.domain.test.ts

describe('BetsDomain', () => {
  describe('placeBet', () => {
    it('should successfully place bet and deduct balance', async () => {
      // Setup
      const userId = 'test-user-id';
      const gameId = 'test-game-id';
      const betAmount = 50;

      // Mock repositories
      jest.spyOn(balancesRepository, 'getBalance').mockResolvedValue({
        chipBalance: 1000
      });

      // Execute
      const result = await betsDomain.placeBet(userId, {
        gameId,
        amount: betAmount
      });

      // Assert
      expect(result.bet.amount).toBe(betAmount);
      expect(result.newBalance).toBeLessThan(1000);
    });

    it('should throw error if insufficient balance', async () => {
      // Setup
      jest.spyOn(balancesRepository, 'getBalance').mockResolvedValue({
        chipBalance: 10
      });

      // Execute & Assert
      await expect(
        betsDomain.placeBet('user-id', { gameId: 'game-id', amount: 50 })
      ).rejects.toThrow('Insufficient balance');
    });
  });
});
```

### Frontend Testing

```bash
cd web
npm test

# Component tests
npm test -- components/GameCard.test.tsx

# Hook tests
npm test -- hooks/useBets.test.tsx
```

### Integration Testing

**End-to-End Flow:**

1. **User Creation & Login:**
   - Create OWNER → Create ADMIN → Create PLAYER
   - Test login with each role
   - Verify JWT tokens

2. **Chip Operations:**
   - ADMIN sells chips to PLAYER
   - Verify balance updated
   - Check chip movement recorded

3. **Game & Betting:**
   - ADMIN creates game
   - PLAYER places bet
   - Verify balance deducted
   - Check bet result (win/loss)
   - Verify prize credited if won

4. **Hierarchy & Permissions:**
   - Verify CASHIER cannot create ADMIN
   - Verify PLAYER cannot access admin routes
   - Verify users can only see their tree

**Manual Test Checklist:**
- [ ] Login as OWNER
- [ ] Create ADMIN user
- [ ] Create CASHIER user
- [ ] Login as CASHIER
- [ ] Create PLAYER user
- [ ] Sell chips to PLAYER ($1000)
- [ ] Login as PLAYER
- [ ] View games list
- [ ] Place bet ($50)
- [ ] Verify balance updated
- [ ] View bet history
- [ ] View transactions
- [ ] Check statistics
- [ ] Logout
- [ ] Login as ADMIN
- [ ] View user tree
- [ ] Create new game
- [ ] Edit game settings
- [ ] Toggle game active/inactive
- [ ] View dashboard metrics

### Performance Testing

```bash
# API load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/health

# Bet placement stress test
ab -n 100 -c 5 -p bet.json -T application/json \
  -H "Authorization: Bearer {token}" \
  http://localhost:3001/api/bets
```

---

## Deployment Guide

### Prerequisites

- Supabase PostgreSQL database
- Node.js hosting (Railway, Heroku, or similar)
- Static hosting for frontend (Vercel, Netlify)

### Step 1: Database Setup (Supabase)

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection string from Settings → Database
3. Run migrations:

```bash
# Option 1: Supabase CLI
supabase link --project-ref your-ref
supabase db push

# Option 2: psql
psql $DATABASE_URL < api/src/persistence/migrations/*.sql
```

### Step 2: Deploy API (Railway)

1. **Connect Repository:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

2. **Configure Build:**
   - Root Directory: `api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://... (from Supabase)
   JWT_SECRET=your-production-secret-32-chars
   JWT_REFRESH_SECRET=your-production-refresh-secret
   SESSION_SECRET=your-production-session-secret
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ADMIN_USERNAME=owner
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=secure-password-change-after-deploy
   ```

4. **Deploy:**
   - Railway will auto-deploy
   - Note the deployed URL (e.g., `https://your-api.up.railway.app`)

5. **Run Migrations:**
   ```bash
   # SSH into Railway container or use CLI
   railway run npm run migrate
   ```

### Step 3: Deploy Frontend (Vercel)

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub

2. **Configure Build:**
   - Framework Preset: Next.js
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Note the deployed URL

### Step 4: Post-Deployment

1. **Test API:**
   ```bash
   curl https://your-api.up.railway.app/api/health
   ```

2. **Test Frontend:**
   - Visit your Vercel URL
   - Try logging in with ADMIN credentials
   - Verify data loads correctly

3. **Update CORS:**
   - Add Vercel URL to `ALLOWED_ORIGINS` in Railway

4. **Change Admin Password:**
   - Login as owner
   - Go to Settings → Change Password
   - Update `ADMIN_PASSWORD` env var in Railway

### Alternative: Heroku Deployment

**API:**
```bash
cd api
heroku create casino-api
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=...
heroku config:set JWT_REFRESH_SECRET=...
heroku config:set SESSION_SECRET=...
git subtree push --prefix api heroku main
heroku run npm run migrate
```

**Frontend:**
```bash
cd web
heroku create casino-web
heroku config:set NEXT_PUBLIC_API_URL=https://casino-api.herokuapp.com
git subtree push --prefix web heroku main
```

---

## Verification Checklist

### Backend Verification

- [ ] Health endpoint responds: `GET /api/health`
- [ ] Swagger docs accessible: `/doc`
- [ ] Database migrations completed
- [ ] Initial OWNER user created
- [ ] Login returns valid JWT tokens
- [ ] Token refresh works
- [ ] All 41 endpoints return 200/201 (with auth)
- [ ] Error responses have correct format
- [ ] CORS allows frontend domain

### Frontend Verification

- [ ] Build completes without errors
- [ ] Environment variable set correctly
- [ ] Login page accessible
- [ ] Can login as OWNER
- [ ] Dashboard loads with real data
- [ ] No mock data imports remaining
- [ ] All pages load without errors
- [ ] Balance displays correctly
- [ ] Can create users
- [ ] Can create games
- [ ] Can place bets
- [ ] Bet results display immediately
- [ ] Balance updates after bet

### Integration Verification

- [ ] Create user flow works end-to-end
- [ ] Sell chips updates balance
- [ ] Place bet deducts balance
- [ ] Winning bet credits payout
- [ ] Losing bet does not double-deduct
- [ ] Transactions appear in history
- [ ] Statistics calculate correctly
- [ ] Tree view shows hierarchy
- [ ] Permissions enforced (try accessing admin as player)
- [ ] Logout clears session

### Performance Verification

- [ ] Dashboard loads in < 2s
- [ ] Bet placement completes in < 1s
- [ ] Large transaction lists paginate correctly
- [ ] No memory leaks on prolonged use

---

## Troubleshooting

### API Issues

**Problem: Database connection fails**
```
Error: connect ECONNREFUSED
```

**Solution:**
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure database allows connections from your IP
- Check if `?sslmode=require` is in connection string

**Problem: JWT token invalid**
```
Error: invalid signature
```

**Solution:**
- Verify `JWT_SECRET` matches between environments
- Clear localStorage and login again
- Check token hasn't expired (15 min for access)

**Problem: Migrations fail**
```
Error: relation "users" already exists
```

**Solution:**
```bash
# Reset migrations
npx sequelize-cli db:migrate:undo:all
npx sequelize-cli db:migrate
```

### Frontend Issues

**Problem: CORS error**
```
Access to fetch has been blocked by CORS policy
```

**Solution:**
- Add frontend URL to `ALLOWED_ORIGINS` in API `.env`
- Restart API server
- Clear browser cache

**Problem: Infinite loading**
```
Components stuck in loading state
```

**Solution:**
- Check API is running: `curl http://localhost:3001/api/health`
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for error messages
- Ensure JWT token is being sent in requests

**Problem: "Insufficient balance" but balance shows correct**
```
Error placing bet
```

**Solution:**
- Check that bet amount is within game min/max limits
- Verify balance is >= bet amount
- Check for pending transactions
- Refresh balance: `loadBalance()`

### Common Errors

**401 Unauthorized:**
- Token expired → Should auto-refresh
- No token → Redirect to login
- Invalid token → Logout and re-login

**403 Forbidden:**
- Insufficient permissions for operation
- Check user role vs required permission
- Verify user is in correct hierarchy

**409 Conflict:**
- Username/email already exists
- Game name already exists

**500 Internal Server Error:**
- Check API logs
- Verify database connection
- Check for unhandled exceptions

### Debug Commands

```bash
# Check API health
curl http://localhost:3001/api/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"your-password"}'

# Test authenticated endpoint
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer {your-token}"

# Check database
psql $DATABASE_URL
\dt  # List tables
SELECT * FROM users LIMIT 5;
SELECT * FROM games;
```

### Logs

**API Logs:**
```bash
# Development
cd api && npm run dev
# Logs to console

# Production (Railway)
railway logs

# Production (Heroku)
heroku logs --tail --app casino-api
```

**Frontend Logs:**
```bash
# Browser console (F12)
# Check Network tab for API calls
# Check Console tab for errors
```

---

## API Response Format

### Success Response

```typescript
{
  "success": true,
  "data": T,  // Response data (type varies by endpoint)
  "meta"?: {  // Optional, for paginated responses
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": string,      // Error code (e.g., "UNAUTHORIZED")
    "message": string,   // Human-readable message
    "details"?: any      // Optional additional context
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No token provided |
| `INVALID_TOKEN` | 401 | Token is invalid |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_CREDENTIALS` | 401 | Wrong username/password |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `USER_BLOCKED` | 403 | User account blocked |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `INSUFFICIENT_BALANCE` | 400 | Not enough chips |
| `INVALID_BET_AMOUNT` | 400 | Bet outside min/max |
| `GAME_INACTIVE` | 400 | Game not active |
| `GAME_NOT_FOUND` | 404 | Game doesn't exist |
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `BET_NOT_FOUND` | 404 | Bet doesn't exist |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `INVALID_HIERARCHY` | 400 | Invalid parent/child relationship |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Security Considerations

### Authentication

- **JWT Tokens**: Access (15 min), Refresh (7 days)
- **Storage**: localStorage for tokens (alternative: httpOnly cookies)
- **Refresh**: Automatic on token expiration
- **Logout**: Invalidates refresh token in database

### Password Security

- **Hashing**: BCrypt with 10 rounds
- **Requirements**: Minimum 8 characters
- **Reset**: Admin can reset user passwords
- **Change**: Users can change their own password

### Input Validation

- **Backend**: Zod schemas validate all inputs
- **Frontend**: Form validation with React Hook Form
- **SQL Injection**: Prevented by Sequelize ORM parameterized queries
- **XSS**: React escapes all rendered content

### Authorization

- **Middleware**: JWT verification on all protected routes
- **Domain Layer**: Role-based permission checks
- **Hierarchy**: Users can only manage users in their tree
- **Ownership**: Users can only modify their own data (except admins)

### CORS

```typescript
// api/src/server.ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

### Rate Limiting (Recommended)

```typescript
// Install: npm install express-rate-limit

import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
```

### Security Headers

```typescript
// Install: npm install helmet

import helmet from 'helmet';

app.use(helmet());
```

### Environment Variables

- **Never commit** `.env` files
- **Use** `.env.example` as template
- **Rotate** secrets regularly
- **Strong secrets**: Minimum 32 characters

### Production Checklist

- [ ] Change default admin password
- [ ] Use HTTPS only
- [ ] Set secure JWT secrets (32+ chars)
- [ ] Enable rate limiting
- [ ] Configure helmet security headers
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Monitor error logs
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Use environment-specific configs
- [ ] Implement session timeout
- [ ] Add CSRF protection (if using cookies)

---

## Additional Resources

- **Swagger API Docs**: `http://localhost:3001/doc`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Sequelize Docs**: https://sequelize.org/docs
- **Zod Docs**: https://zod.dev

---

## Support

For issues or questions:
1. Check this integration guide first
2. Review Swagger documentation at `/doc`
3. Check error codes in API Response Format section
4. Verify environment variables are set correctly
5. Check logs for detailed error messages

---

**Last Updated:** 2025-01-09

**Version:** 1.0.0

---

Made with ❤️ using TypeScript, React, and Node.js
