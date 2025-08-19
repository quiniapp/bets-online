// Core type definitions for the platform

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  enabledGames: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  role: 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  minBet: number;
  maxBet: number;
}

export interface Bet {
  id: string;
  userId: string;
  gameId: string;
  amount: number;
  outcome: 'pending' | 'won' | 'lost';
  createdAt: Date;
  settledAt?: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'adjustment';
  amount: number;
  description: string;
  adminId?: string;
  createdAt: Date;
}

export interface AuthContextType {
  user: User | Admin | null;
  role: 'user' | 'admin' | null;
  login: (credentials: LoginCredentials, role: 'user' | 'admin') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}