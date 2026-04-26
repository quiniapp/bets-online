import {
  UserRole,
  UserStatus,
  ChipMovementType,
  CompensationType,
  SettlementStatus,
  PanelStatus,
  RecoveryMode,
  RecoveryStatus
} from './enums.types';

/**
 * User Model
 */
export interface User {
  id: string;
  parentUserId: string | null;
  role: UserRole;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  passwordHash?: string;
  status: UserStatus;
  lastConnection: Date | null;
  lastActivity: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Create DTO
 */
export interface CreateUserDto {
  parentUserId?: string;
  role: UserRole;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  initialBalance?: number;
}

/**
 * User Update DTO
 */
export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

/**
 * Balance Model
 */
export interface Balance {
  id: string;
  userId: string;
  chipBalance: number;
  lastUpdatedAt: Date;
}

/**
 * Chip Movement Model
 */
export interface ChipMovement {
  id: string;
  userId: string;
  relatedUserId?: string | null;
  type: ChipMovementType;
  amount: number;
  description?: string;
  previousBalance: number;
  newBalance: number;
  idempotencyKey?: string | null;
  createdAt: Date;
}

/**
 * Create Chip Movement DTO
 */
export interface CreateChipMovementDto {
  userId: string;
  relatedUserId?: string;
  type: ChipMovementType;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

/**
 * Cashier Compensation Mode
 */
export interface CashierCompensationMode {
  id: string;
  cashierId: string;
  type: CompensationType;
  percentage?: number | null;
  activeFrom: Date;
  activeTo?: Date | null;
  createdAt: Date;
}

/**
 * Create Compensation Mode DTO
 */
export interface CreateCompensationModeDto {
  cashierId: string;
  type: CompensationType;
  percentage?: number;
}

/**
 * Cashier Settlement (for percentage model)
 */
export interface CashierSettlement {
  id: string;
  cashierId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  totalPrizesPaid: number;
  profit: number;
  payableAmount: number;
  status: SettlementStatus;
  createdAt: Date;
  paidAt?: Date | null;
}

/**
 * Create Settlement DTO
 */
export interface CreateSettlementDto {
  cashierId: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Chip Panel (for panel model)
 */
export interface ChipPanel {
  id: string;
  cashierId: string;
  buyPricePerChip: number;
  sellPricePerChip: number;
  totalChips: number;
  soldChips: number;
  status: PanelStatus;
  createdAt: Date;
  settledAt?: Date | null;
}

/**
 * Create Panel DTO
 */
export interface CreatePanelDto {
  cashierId: string;
  buyPricePerChip: number;
  sellPricePerChip: number;
  totalChips: number;
}

/**
 * Recovery Model
 */
export interface Recovery {
  id: string;
  adminId: string;
  cashierId: string;
  relatedMovementId?: string | null;
  amount: number;
  recoveryMode: RecoveryMode;
  status: RecoveryStatus;
  amountPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Recovery DTO
 */
export interface CreateRecoveryDto {
  adminId: string;
  cashierId: string;
  relatedMovementId?: string;
  amount: number;
  recoveryMode: RecoveryMode;
}

/**
 * User Game Provider Blocklist
 */
export interface UserGameProviderBlocklist {
  id: string;
  userId: string;
  providerId: string;
  blockedBy: string;
  createdAt: Date;
}

/**
 * Session Model
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Auth Tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT Payload
 */
export interface JwtPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * User Tree Node (for hierarchy visualization)
 */
export interface UserTreeNode {
  user: User;
  balance: Balance;
  children: UserTreeNode[];
}

/**
 * Game Model
 */
export interface Game {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  providerId?: string | null;
  providerGameId?: string | null;   // e.g. "vs25wolfgold"
  providerName?: string | null;     // e.g. "pragmatic"
  defaultLogo?: string | null;      // thumbnail URL from Provider
  gameType?: string | null;         // e.g. "slot"
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bet Status Enum
 */
export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

/**
 * Bet Model
 */
export interface Bet {
  id: string;
  userId: string;
  gameId: string;
  amount: number;
  status: BetStatus;
  multiplier?: number | null;
  payout?: number | null;
  resultData?: any;
  createdAt: Date;
  settledAt?: Date | null;
}

/**
 * Create Game DTO
 */
export interface CreateGameDto {
  name: string;
  description: string;
  minBet: number;
  maxBet: number;
  houseEdge?: number;
  providerId?: string;
}

/**
 * Update Game DTO
 */
export interface UpdateGameDto {
  description?: string;
  isActive?: boolean;
  minBet?: number;
  maxBet?: number;
  houseEdge?: number;
  sortOrder?: number | null;
}

/**
 * Provider Model
 */
export interface Provider {
  id: string;
  name: string;
  displayName: string | null;
  isActive: boolean;
  logoUrl: string | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Game Type Model
 */
export interface GameType {
  id: string;
  name: string;
  displayName: string | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update Provider DTO
 */
export interface UpdateProviderDto {
  displayName?: string | null;
  isActive?: boolean;
  logoUrl?: string | null;
  sortOrder?: number | null;
}

/**
 * Update GameType DTO
 */
export interface UpdateGameTypeDto {
  displayName?: string | null;
  sortOrder?: number | null;
}

/**
 * Featured Game Model
 */
export interface FeaturedGame {
  id: string;
  gameId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Featured Game with embedded game data (for public reads)
 */
export interface FeaturedGameWithGame extends FeaturedGame {
  game: Game;
}

/**
 * Create Featured Game DTO
 */
export interface CreateFeaturedGameDto {
  gameId: string;
  sortOrder: number;
}

/**
 * Update Featured Game DTO
 */
export interface UpdateFeaturedGameDto {
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Game Banner Model
 */
export interface GameBanner {
  id: string;
  gameId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Game Banner with embedded game data (for public reads)
 */
export interface GameBannerWithGame extends GameBanner {
  game: Game;
}

/**
 * Create Game Banner DTO
 */
export interface CreateGameBannerDto {
  gameId: string;
  sortOrder: number;
}

/**
 * Update Game Banner DTO
 */
export interface UpdateGameBannerDto {
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Create Bet DTO
 */
export interface CreateBetDto {
  gameId: string;
  amount: number;
}

/**
 * Bet Result (returned after placing bet with simulation)
 */
export interface BetResult {
  bet: Bet;
  movement?: ChipMovement;
  newBalance: number;
}
