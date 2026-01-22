/**
 * Application Constants
 */

/**
 * Default Pagination
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Token Expiration
 */
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Password
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const BCRYPT_ROUNDS = 10;

/**
 * User Constraints
 */
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;

/**
 * Settlement
 */
export const DEFAULT_SETTLEMENT_PERIOD_DAYS = 7;

/**
 * Chip Balance
 */
export const INITIAL_CHIP_BALANCE = 0;
export const MIN_CHIP_BALANCE = 0;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid username or password',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_BLOCKED: 'User is blocked',
  INVALID_ROLE: 'Invalid user role',
  INVALID_HIERARCHY: 'Invalid user hierarchy',

  // Permissions
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  CANNOT_VIEW_USER: 'Cannot view this user',
  CANNOT_MODIFY_USER: 'Cannot modify this user',

  // Chips
  INSUFFICIENT_BALANCE: 'Insufficient chip balance',
  INVALID_AMOUNT: 'Invalid amount',
  NEGATIVE_BALANCE_NOT_ALLOWED: 'Balance cannot be negative',

  // General
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  DATABASE_ERROR: 'Database error'
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_BLOCKED: 'User blocked successfully',
  USER_UNBLOCKED: 'User unblocked successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET: 'Password reset successfully',
  CHIPS_SOLD: 'Chips sold successfully',
  PRIZE_PAID: 'Prize paid successfully',
  LOSS_REGISTERED: 'Loss registered successfully',
  WITHDRAWAL_PROCESSED: 'Withdrawal processed successfully',
  BET_PLACED: 'Bet placed successfully',
  GAME_CREATED: 'Game created successfully',
  GAME_UPDATED: 'Game updated successfully',
  PANEL_CREATED: 'Panel created successfully',
  RECOVERY_CREATED: 'Recovery created successfully',
  SETTLEMENT_CREATED: 'Settlement created successfully'
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

/**
 * Role Hierarchy (for permissions)
 */
export const ROLE_HIERARCHY = {
  OWNER: 4,
  ADMIN: 3,
  CASHIER: 2,
  PLAYER: 1
};
