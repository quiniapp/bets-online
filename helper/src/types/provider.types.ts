export enum TransactionType {
  Debit = 'Debit',
  Credit = 'Credit',
  Reversal = 'Reversal'
}

export enum BetType {
  Cash = 'Cash',
  Promo = 'Promo',
  OperatorFreeSpinBonus = 'OperatorFreeSpinBonus',
  ProviderFreeSpinBonus = 'ProviderFreeSpinBonus'
}

export enum GameRoundStatus {
  Started = 'Started',
  InProgress = 'InProgress',
  None = 'None',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum ViralErrorCode {
  GeneralFailure = 'GeneralFailure',
  AuthenticationFailure = 'AuthenticationFailure',
  RequestValidationFailure = 'RequestValidationFailure',
  InsufficientFunds = 'InsufficientFunds',
  PlayerNotActive = 'PlayerNotActive',
  PlayerBlocked = 'PlayerBlocked',
  PlayerFrozen = 'PlayerFrozen',
  PlayerSelfExclusion = 'PlayerSelfExclusion',
  GameDisabled = 'GameDisabled',
  CurrencyMismatch = 'CurrencyMismatch',
  GameRoundNotFound = 'GameRoundNotFound',
  DoubleTransactionWithDifferentAmount = 'DoubleTransactionWithDifferentAmount',
  RealMoneyNotAllowed = 'RealMoneyNotAllowed',
  LossLimitExceeded = 'LossLimitExceeded',
  SpendLimitExceeded = 'SpendLimitExceeded'
}

export enum AwardType {
  Money = 'Money'
}

export enum JackpotType {
  Jackpot = 'Jackpot',
  GlobalJackpot = 'GlobalJackpot'
}

export enum ReversalOfType {
  Credit = 'Credit',
  Debit = 'Debit'
}

export interface BetOutcomeWin {
  amount: string;
  awardType: AwardType;
  id: string;
  type?: JackpotType;
}

export interface BetOutcomeEventData {
  jackpotWins?: BetOutcomeWin[];
  tournamentWins?: BetOutcomeWin[];
  campaignWins?: BetOutcomeWin[];
  cashBonusWins?: BetOutcomeWin[];
  reversalOfType?: ReversalOfType;
}

export interface ProviderBalanceRequest {
  token: string;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
}

export interface ProviderTransactionRequest {
  transactionType: TransactionType;
  betType: BetType;
  gameRoundStatus?: GameRoundStatus;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
  token?: string;
  amount: string;
  currency?: string;
  providerGameRoundId: string;
  providerTransactionId: string;
  betOutcomeEventData?: BetOutcomeEventData;
}

export interface ProviderBalanceResponse {
  balance: string;
  currency: string;
}

export interface ProviderTransactionResponse {
  balance: string;
  currency: string;
  operatorTransactionId: string;
  alreadyProcessed?: boolean;
}

export interface ViralErrorResponse {
  viralErrorCode: ViralErrorCode;
  message: string;
}

export interface UserProviderProfile {
  id: string;
  userId: string;
  providerName: string;
  providerPlayerId: string;
  currency: string;
  countryCode: string;
  isActive: boolean;
  currentProviderGameId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderTransaction {
  id: string;
  providerName: string;
  providerTransactionId: string;
  providerGameRoundId: string | null;
  providerGameId: string | null;
  providerPlayerId: string;
  userId: string;
  transactionType: TransactionType;
  betType: BetType | null;
  gameRoundStatus: GameRoundStatus | null;
  amount: string;
  currency: string;
  balanceAfter: string;
  betOutcomeEventData: BetOutcomeEventData | null;
  createdAt: Date;
  updatedAt: Date;
}
