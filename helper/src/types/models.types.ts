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
import type { ThemeTokenName } from '../constants';

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
  userUsername?: string | null;
  relatedUserId?: string | null;
  relatedUsername?: string | null;
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
 * Cashier Settlement.
 *
 * Flujo semanal (período libre): el owner entrega fichas al cajero, el cajero
 * las vende a sus jugadores y al cerrar el período el owner liquida:
 *   comisión = venta de fichas × %
 *   subtotal = venta de fichas − comisión  (lo que el cajero le debe al owner)
 *   total    = saldo anterior (deuda arrastrada) + subtotal
 *   arrastre = total − cobro               (pasa a la liquidación siguiente)
 * Además se le retiran al cajero las fichas de premios (el owner le paga el
 * premio al jugador) y, opcionalmente, las fichas no vendidas que no se le dejen.
 *
 * Los campos marcados como "null en liquidaciones viejas" no existían en el
 * modelo anterior (comisión pagada al cajero) y quedan en null para esas filas.
 */
export interface CashierSettlement {
  id: string;
  cashierId: string;
  periodStart: Date;
  periodEnd: Date;
  /** Venta de fichas del período */
  totalSales: number;
  /** Premios del período (fichas que el cajero retiró a jugadores ganadores) */
  totalPrizesPaid: number;
  /** Ganancia del owner: subtotal − premios */
  profit: number;
  /** Comisión del cajero (se mantiene por compatibilidad; igual a commission) */
  payableAmount: number;
  status: SettlementStatus;
  compensationType?: CompensationType | null;
  percentage?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  paidBy?: string | null;
  paymentReference?: string | null;
  createdAt: Date;
  paidAt?: Date | null;
  /** Comisión del cajero (null en liquidaciones viejas) */
  commission: number | null;
  /** Venta de fichas − comisión (null en liquidaciones viejas) */
  subtotal: number | null;
  /** Deuda arrastrada de la liquidación anterior */
  previousDebt: number | null;
  /** previousDebt + subtotal */
  totalDue: number | null;
  /** Total cobrado al cajero por esta liquidación (incluye cobros posteriores) */
  collected: number | null;
  /** totalDue − collected; negativo = saldo a favor del cajero */
  debtCarried: number | null;
  /** Fichas que el owner le entregó al cajero en el período */
  chipsDelivered: number | null;
  /** Saldo de fichas del cajero al momento de liquidar (antes de retirar) */
  chipBalanceBefore: number | null;
  /** Fichas de premios retiradas al cajero */
  prizeChipsRecovered: number | null;
  /** Fichas no vendidas al momento de liquidar */
  unsoldChips: number | null;
  /** Fichas no vendidas que se le dejan al cajero (deje) */
  chipsLeft: number | null;
  /** Fichas no vendidas retiradas al cajero */
  unsoldChipsRecovered: number | null;
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
 * Active compensation configuration of a cashier, as shown in the account module.
 */
export interface CashierCompensationSummary {
  type: CompensationType;
  percentage: number | null;
  activeFrom: Date;
}

/**
 * Situación de un cajero con el owner.
 * "open*" = movimientos todavía no liquidados.
 */
export interface CashierAccountSummary {
  cashierId: string;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status: UserStatus;
  /** Fichas en poder del cajero ahora */
  chipBalance: number;
  compensation: CashierCompensationSummary | null;
  /** Histórico (liquidado + abierto) */
  totalSales: number;
  totalPrizes: number;
  totalCommission: number;
  /** Total cobrado al cajero en todas las liquidaciones */
  totalCollected: number;
  /** Sin liquidar */
  openSales: number;
  openPrizes: number;
  openCommission: number;
  openSubtotal: number;
  /** Deuda arrastrada de la última liquidación */
  debt: number;
  /** debt + openSubtotal: lo que el cajero le debe hoy al owner */
  balanceDue: number;
  lastSettlementAt: Date | null;
  lastSettlementEnd: Date | null;
}

/**
 * Aggregated totals across every cashier account (not just the current page).
 */
export interface CashierAccountsSummary {
  totalCashiers: number;
  totalSales: number;
  totalPrizes: number;
  totalCommission: number;
  totalCollected: number;
  openSubtotal: number;
  debt: number;
  balanceDue: number;
  chipBalance: number;
}

/**
 * Payload of GET /cashier-accounts.
 */
export interface CashierAccountsListResult {
  accounts: CashierAccountSummary[];
  summary: CashierAccountsSummary;
}

/**
 * Daily current account of a cashier (modelo anterior, ya no se usa en la UI).
 * @deprecated reemplazado por la cuenta corriente por período.
 */
export interface CashierDailyAccount {
  id: string;
  cashierId: string;
  cashierUsername: string;
  date: string;
  pass: number;
  successes: number;
  claims: number;
  subtotal: number;
  previousBalance: number;
  collections: number;
  paid: number;
  total: number;
  drag: number;
  leave: number;
  cashierCommission: number;
  bills: number;
  revenue: number;
  previousDrag: number;
  isLiquidated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated reemplazado por la cuenta corriente por período.
 */
export interface CashierDailyAccountTotals {
  pass: number;
  successes: number;
  claims: number;
  subtotal: number;
  previousBalance: number;
  collections: number;
  paid: number;
  total: number;
  drag: number;
  leave: number;
  cashierCommission: number;
}

/**
 * @deprecated reemplazado por la cuenta corriente por período.
 */
export interface CashierDailyAccountsResult {
  date: string;
  accounts: CashierDailyAccount[];
  totals: CashierDailyAccountTotals;
}

/**
 * @deprecated reemplazado por la cuenta corriente por período.
 */
export interface UpdateCashierDailyAccountDto {
  claims?: number;
  collections?: number;
  paid?: number;
  leave?: number;
}

/**
 * A settlement row enriched with the cashier username for the global list.
 */
export interface CashierSettlementWithCashier extends CashierSettlement {
  cashierUsername: string;
}

/**
 * Tipo de renglón en la cuenta corriente de un cajero.
 */
export type CashierLedgerKind =
  | 'CHIPS_DELIVERED'        // owner → cajero
  | 'CHIPS_RETURNED'         // retiro manual de fichas al cajero
  | 'SALE'                   // cajero → jugador (venta de fichas)
  | 'PRIZE'                  // jugador → cajero (fichas de premio)
  | 'PLAYER_RETURN'          // otros retiros de fichas a jugadores (pérdida / retiro)
  | 'PRIZE_CHIPS_RECOVERED'  // liquidación: se retiran fichas de premios
  | 'UNSOLD_CHIPS_RECOVERED' // liquidación: se retiran fichas no vendidas
  | 'SETTLEMENT_REVERSAL'    // anulación de liquidación: se devuelven fichas
  | 'SETTLEMENT'             // liquidación: subtotal que el cajero debe
  | 'COLLECTION'             // cobro al cajero
  | 'OTHER';

/**
 * Renglón de la cuenta corriente de un cajero. Combina movimientos de fichas
 * y movimientos de dinero (liquidaciones y cobros).
 */
export interface CashierAccountMovement {
  id: string;
  kind: CashierLedgerKind;
  type: ChipMovementType | null;
  playerId: string | null;
  playerUsername: string | null;
  /** Efecto en el saldo de fichas del cajero (+ entra, − sale) */
  chips: number;
  /** Efecto en la deuda del cajero con el owner (+ debe más, − debe menos) */
  money: number;
  /** Monto original del movimiento de fichas (compatibilidad) */
  amount: number;
  description?: string | null;
  settlementId?: string | null;
  createdAt: Date;
}

/**
 * Full detail returned by GET /cashier-accounts/:cashierId.
 */
export interface CashierAccountDetail {
  account: CashierAccountSummary;
  settlements: CashierSettlement[];
  movements: CashierAccountMovement[];
}

/**
 * Cálculo de la liquidación de un cajero para un período (todavía sin guardar).
 */
export interface CashierSettlementPreview {
  cashierId: string;
  cashierUsername?: string;
  periodStart: Date;
  periodEnd: Date;
  compensation: CashierCompensationSummary | null;
  /** Fichas entregadas por el owner en el período */
  chipsDelivered: number;
  /** Venta de fichas */
  totalSales: number;
  /** Premios */
  totalPrizes: number;
  commission: number;
  /** totalSales − commission */
  subtotal: number;
  /** Deuda arrastrada de la última liquidación (saldo anterior) */
  previousDebt: number;
  /** previousDebt + subtotal */
  totalDue: number;
  /** Fichas que tiene hoy el cajero */
  chipBalance: number;
  /** Fichas de premios que se le van a retirar (premios, limitado al saldo) */
  prizeChipsToRecover: number;
  /** chipBalance − prizeChipsToRecover */
  unsoldChips: number;
  /** subtotal − premios: ganancia del owner */
  profit: number;
  /** Igual a commission (compatibilidad) */
  payableAmount: number;
  /** Fin de la última liquidación del cajero */
  lastSettlementEnd: Date | null;
  /**
   * Si hay un hueco sin liquidar entre la última liquidación y el inicio del
   * período elegido, la fecha desde la que hay movimientos sin liquidar.
   */
  unsettledSince: Date | null;
}

/**
 * Fila de la cuenta corriente por período: el cálculo en vivo si el período
 * todavía no se liquidó, o la liquidación guardada si ya se liquidó.
 */
export interface CashierPeriodAccount {
  preview: CashierSettlementPreview;
  settlement: CashierSettlement | null;
}

/**
 * Totales de la cuenta corriente por período.
 */
export interface CashierPeriodAccountTotals {
  chipsDelivered: number;
  totalSales: number;
  totalPrizes: number;
  commission: number;
  subtotal: number;
  previousDebt: number;
  totalDue: number;
  collected: number;
  debtCarried: number;
  unsoldChips: number;
  chipsLeft: number;
}

/**
 * Payload of GET /cashier-accounts/period.
 */
export interface CashierPeriodAccountsResult {
  periodStart: Date;
  periodEnd: Date;
  accounts: CashierPeriodAccount[];
  totals: CashierPeriodAccountTotals;
}

/**
 * Update the active compensation mode of a cashier.
 */
export interface UpdateCashierCompensationDto {
  type: CompensationType;
  percentage: number;
}

/**
 * Liquidar un período de un cajero.
 */
export interface CreateCashierSettlementDto {
  periodStart: Date;
  periodEnd: Date;
  /** Monto cobrado al cajero. Por defecto, el total (saldo anterior + subtotal). */
  collected?: number;
  /** Fichas no vendidas que se le dejan al cajero. Por defecto, todas. */
  chipsLeft?: number;
  paymentReference?: string;
  notes?: string;
}

/**
 * Registrar un cobro posterior sobre la última liquidación de un cajero.
 */
export interface CollectCashierSettlementDto {
  amount: number;
  paymentReference?: string;
  notes?: string;
}

/**
 * Cobro al cajero.
 */
export interface CashierCollection {
  id: string;
  settlementId: string;
  cashierId: string;
  amount: number;
  paymentReference: string | null;
  createdBy: string | null;
  createdAt: Date;
}

/**
 * @deprecated el cajero ya no cobra comisión del owner: se usa CollectCashierSettlementDto.
 */
export interface PayCashierSettlementDto {
  paymentReference?: string;
  notes?: string;
}

/**
 * Balance y ganancias del owner.
 */
export interface OwnerAccountTotals {
  settlements: number;
  totalSales: number;
  commission: number;
  /** venta − comisión: ingreso neto del owner */
  subtotal: number;
  /** Premios que pagó el owner a los jugadores */
  prizes: number;
  /** subtotal − premios */
  profit: number;
  /** Cobros a cajeros */
  collected: number;
  /** cobros − premios: caja neta del período */
  cashFlow: number;
  chipsDelivered: number;
  chipsRecovered: number;
}

export interface OwnerAccountMovement {
  id: string;
  kind: 'SETTLEMENT' | 'COLLECTION' | 'PRIZES';
  cashierId: string;
  cashierUsername: string;
  settlementId: string;
  /** Efecto en la caja del owner (+ entra, − sale); 0 para SETTLEMENT */
  cash: number;
  /** Efecto en la ganancia del owner */
  profit: number;
  description: string;
  createdAt: Date;
}

export interface OwnerAccountSummary {
  periodStart: Date;
  periodEnd: Date;
  /** Liquidaciones cerradas dentro del rango */
  settled: OwnerAccountTotals;
  /** Cobros registrados dentro del rango (incluye cobros de liquidaciones anteriores) */
  collectedInRange: number;
  /** Situación actual, independiente del rango */
  current: {
    /** Lo que los cajeros deben hoy (deuda arrastrada) */
    cashierDebt: number;
    /** Ventas aún sin liquidar, menos comisión */
    openSubtotal: number;
    openSales: number;
    openPrizes: number;
    /** Fichas en poder de cajeros */
    cashierChips: number;
    /** Fichas en poder de jugadores */
    playerChips: number;
  };
  movements: OwnerAccountMovement[];
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
  customLogo?: string | null;       // custom uploaded image, overrides defaultLogo in UI
  gameType?: string | null;         // e.g. "slot"
  rtp?: number | null;              // return-to-player % from provider sync (e.g. 96.47)
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
  gameId?: string | null;       // game opened when the banner is clicked
  placement: 'hero' | 'promo';  // hero carousel vs small promo row
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string | null;     // public Supabase Storage URL of the banner image
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Game Banner with optional embedded game data (legacy; banners are standalone)
 */
export interface GameBannerWithGame extends GameBanner {
  game?: Game | null;
}

/**
 * Create Game Banner DTO — image is sent as multipart, not in the body
 */
export interface CreateGameBannerDto {
  sortOrder?: number;
  gameId?: string | null;
  placement?: 'hero' | 'promo';
}

/**
 * Update Game Banner DTO
 */
export interface UpdateGameBannerDto {
  sortOrder?: number;
  isActive?: boolean;
  gameId?: string | null;
  placement?: 'hero' | 'promo';
}

/**
 * Game Image Model (custom uploaded image for a game)
 */
export interface GameImage {
  id: string;
  gameId: string;
  url: string;
  label?: string | null;
  createdAt: Date;
}

/**
 * Create Game Image DTO
 */
export interface CreateGameImageDto {
  gameId: string;
  url: string;
  label?: string;
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

/**
 * Casino Layout Settings Types
 */
export type LobbySlotKind = 'category' | 'provider' | 'both'

export interface LobbySlot {
  id: string
  kind: LobbySlotKind
  categoryType?: string
  providerName?: string
  label: string
}

export interface FooterLink {
  id: string
  label: string
  href: string
  visible: boolean
}

/**
 * Item of the mobile bottom navbar (Lobby is implicit and always first; not stored)
 */
export interface BottomNavItem {
  categoryType: string
  visible: boolean
}

export type CasinoThemeId = 'light' | 'dark' | 'casino' | 'custom'

/**
 * Optional background gradient of a generated theme. Rendered as a
 * linear-gradient over the base background color.
 */
export interface CasinoBackgroundGradient {
  angle: number
  from: string
  to: string
  via?: string
}

/**
 * Per-game-card overrides of a generated theme (players site). Applied as CSS
 * variables with sensible fallbacks, so a missing field keeps the default look.
 */
export interface CasinoGameCardTokens {
  background?: string
  border?: string
  radius?: number
  overlay?: string
}

/**
 * Tokens of a theme generated from the admin panel. Only used when
 * CasinoSettings.theme === 'custom'; base picks the light/dark variable set
 * that the token overrides are layered on top of.
 */
export interface CasinoThemeConfig {
  base: 'light' | 'dark'
  tokens: Partial<Record<ThemeTokenName, string>>
  backgroundGradient?: CasinoBackgroundGradient | null
  gameCard?: CasinoGameCardTokens | null
}

/**
 * A theme built with the admin generator and stored in the library. Saving a
 * theme does NOT apply it; the header toggle applies it later.
 */
export interface SavedCustomTheme {
  id: string
  name: string
  config: CasinoThemeConfig
}

export interface CasinoSettings {
  id: string
  ownerId: string
  headerCategories: string[]
  lobbySlots: LobbySlot[]
  footerLinks: FooterLink[]
  bottomNavItems: BottomNavItem[]
  theme: CasinoThemeId
  themeConfig: CasinoThemeConfig | null
  savedThemes: SavedCustomTheme[]
  activeThemeId: string | null
  updatedAt: Date
}

export interface UpdateCasinoSettingsDto {
  headerCategories?: string[]
  lobbySlots?: LobbySlot[]
  footerLinks?: FooterLink[]
  bottomNavItems?: BottomNavItem[]
  theme?: CasinoThemeId
  themeConfig?: CasinoThemeConfig
  savedThemes?: SavedCustomTheme[]
  activeThemeId?: string | null
}

/**
 * Aggregated public lobby payload (GET /api/lobby) — everything the home
 * needs in a single response instead of ~10 requests after hydration.
 */
export interface LobbySlotGames {
  /** LobbySlot.id this section belongs to */
  id: string
  games: Game[]
  total: number
}

export interface LobbyData {
  settings: CasinoSettings
  types: string[]
  providers: Provider[]
  featured: FeaturedGameWithGame[]
  slots: LobbySlotGames[]
}

/**
 * Per-provider game-type ordering rule. Games of a provider are grouped by
 * type following these sort orders; types without a rule fall back to the
 * global GameType.sortOrder.
 */
export interface ProviderGameTypeOrder {
  id: string
  providerName: string
  gameType: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Effective type-order item for a provider as consumed/produced by the admin
 * editor: every distinct game_type of the provider, with its rule sortOrder
 * (null = no rule yet) and the global display name if any.
 */
export interface ProviderTypeOrderItem {
  gameType: string
  sortOrder: number | null
  displayName?: string | null
  gamesCount?: number
}
