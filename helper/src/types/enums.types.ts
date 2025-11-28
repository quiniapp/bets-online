/**
 * User Roles in the Casino Platform
 */
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  PLAYER = 'PLAYER'
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING'
}

/**
 * Chip Movement Types
 */
export enum ChipMovementType {
  // Sales
  SELL_TO_PLAYER = 'SELL_TO_PLAYER',
  BUY_FROM_ADMIN = 'BUY_FROM_ADMIN',

  // Game Results
  PRIZE = 'PRIZE',
  LOSS = 'LOSS',

  // Transactions
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',

  // Administrative
  RECOVERY = 'RECOVERY',
  ADJUSTMENT = 'ADJUSTMENT',

  // Panel
  PANEL_ASSIGNMENT = 'PANEL_ASSIGNMENT',
  PANEL_SALE = 'PANEL_SALE'
}

/**
 * Cashier Compensation Types
 */
export enum CompensationType {
  PERCENTAGE = 'PERCENTAGE',
  PANEL = 'PANEL',
  FIXED = 'FIXED',
  HYBRID = 'HYBRID'
}

/**
 * Settlement Status
 */
export enum SettlementStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  PARTIALLY_PAID = 'PARTIALLY_PAID'
}

/**
 * Panel Status
 */
export enum PanelStatus {
  OPEN = 'OPEN',
  FULLY_SOLD = 'FULLY_SOLD',
  SETTLED = 'SETTLED',
  CANCELED = 'CANCELED'
}

/**
 * Recovery Mode
 */
export enum RecoveryMode {
  AUTO_DEDUCT_FROM_COMMISSION = 'AUTO_DEDUCT_FROM_COMMISSION',
  INSTALMENTS = 'INSTALMENTS',
  MANUAL = 'MANUAL'
}

/**
 * Recovery Status
 */
export enum RecoveryStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELED = 'CANCELED'
}
