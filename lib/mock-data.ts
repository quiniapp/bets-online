// Mock data for the betting platform (no database)

export interface User {
  id: string
  username: string
  email: string
  balance: number
  enabledGames: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Admin {
  id: string
  username: string
  email: string
  role: "admin"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Game {
  id: string
  name: string
  description: string
  isActive: boolean
  minBet: number
  maxBet: number
}

export interface Bet {
  id: string
  userId: string
  gameId: string
  amount: number
  outcome: "pending" | "won" | "lost"
  multiplier?: number
  createdAt: Date
  settledAt?: Date
}

export interface Transaction {
  id: string
  userId: string
  type: "deposit" | "withdrawal" | "bet" | "win" | "adjustment"
  amount: number
  description: string
  adminId?: string
  createdAt: Date
}

export interface GameAccessRequest {
  id: string
  userId: string
  gameId: string
  status: "pending" | "approved" | "denied"
  message?: string
  requestedAt: Date
  respondedAt?: Date
  respondedByAdminId?: string
}

// Mock data
export const mockUsers: User[] = [
  {
    id: "1",
    username: "john_doe",
    email: "john@example.com",
    balance: 1500.0,
    enabledGames: ["1", "2"],
    isActive: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "2",
    username: "jane_smith",
    email: "jane@example.com",
    balance: 750.5,
    enabledGames: ["1"],
    isActive: true,
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-19"),
  },
  {
    id: "3",
    username: "mike_wilson",
    email: "mike@example.com",
    balance: 2200.75,
    enabledGames: ["1", "2", "3"],
    isActive: false,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-22"),
  },
]

export const mockAdmins: Admin[] = [
  {
    id: "admin1",
    username: "admin",
    email: "admin@betplatform.com",
    role: "admin",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "admin2",
    username: "superadmin",
    email: "super@betplatform.com",
    role: "admin",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

export const mockGames: Game[] = [
  {
    id: "1",
    name: "Roulette",
    description: "Classic casino roulette with European rules",
    isActive: true,
    minBet: 1.0,
    maxBet: 1000.0,
  },
  {
    id: "2",
    name: "Blackjack",
    description: "Traditional blackjack with standard rules",
    isActive: true,
    minBet: 5.0,
    maxBet: 500.0,
  },
  {
    id: "3",
    name: "Slots",
    description: "Multi-line slot machine with bonus rounds",
    isActive: true,
    minBet: 0.25,
    maxBet: 100.0,
  },
  {
    id: "4",
    name: "Poker",
    description: "Texas Hold'em poker tournaments",
    isActive: false,
    minBet: 10.0,
    maxBet: 2000.0,
  },
]

export const mockBets: Bet[] = [
  {
    id: "bet1",
    userId: "1",
    gameId: "1",
    amount: 50.0,
    outcome: "won",
    multiplier: 2.5,
    createdAt: new Date("2024-01-20T10:30:00"),
    settledAt: new Date("2024-01-20T10:31:00"),
  },
  {
    id: "bet2",
    userId: "1",
    gameId: "2",
    amount: 25.0,
    outcome: "lost",
    createdAt: new Date("2024-01-20T11:15:00"),
    settledAt: new Date("2024-01-20T11:18:00"),
  },
  {
    id: "bet3",
    userId: "2",
    gameId: "1",
    amount: 100.0,
    outcome: "pending",
    createdAt: new Date("2024-01-20T14:22:00"),
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: "tx1",
    userId: "1",
    type: "deposit",
    amount: 1000.0,
    description: "Initial deposit",
    createdAt: new Date("2024-01-15T09:00:00"),
  },
  {
    id: "tx2",
    userId: "1",
    type: "bet",
    amount: -50.0,
    description: "Roulette bet",
    createdAt: new Date("2024-01-20T10:30:00"),
  },
  {
    id: "tx3",
    userId: "1",
    type: "win",
    amount: 125.0,
    description: "Roulette win (2.5x)",
    createdAt: new Date("2024-01-20T10:31:00"),
  },
  {
    id: "tx4",
    userId: "2",
    type: "adjustment",
    amount: 50.0,
    description: "Balance adjustment by admin",
    adminId: "admin1",
    createdAt: new Date("2024-01-19T16:45:00"),
  },
]

export const mockGameAccessRequests: GameAccessRequest[] = [
  {
    id: "req1",
    userId: "2",
    gameId: "2",
    status: "pending",
    message: "Would like access to Blackjack",
    requestedAt: new Date("2024-01-20T12:00:00"),
  },
  {
    id: "req2",
    userId: "3",
    gameId: "1",
    status: "approved",
    message: "Requesting Roulette access",
    requestedAt: new Date("2024-01-18T14:30:00"),
    respondedAt: new Date("2024-01-18T15:00:00"),
    respondedByAdminId: "admin1",
  },
]

// Mock authentication functions
export const authenticateUser = (username: string, password: string): User | null => {
  // Simple mock authentication - in real app, this would hash passwords
  if (username === "john_doe" && password === "password123") {
    return mockUsers[0]
  }
  if (username === "jane_smith" && password === "password123") {
    return mockUsers[1]
  }
  if (username === "mike_wilson" && password === "password123") {
    return mockUsers[2]
  }
  return null
}

export const authenticateAdmin = (username: string, password: string): Admin | null => {
  // Simple mock authentication
  if (username === "admin" && password === "admin123") {
    return mockAdmins[0]
  }
  if (username === "superadmin" && password === "super123") {
    return mockAdmins[1]
  }
  return null
}
