// Application constants
export const ROUTES = {
  HOME: '/',
  ADMIN_LOGIN: '/admin-login',
  USER_LOGIN: '/user-login',
  ADMIN_DASHBOARD: '/admin',
  USER_DASHBOARD: '/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_GAMES: '/admin/games',
  ADMIN_BALANCE: '/admin/balance',
  ADMIN_MANAGEMENT: '/admin/management',
  USER_PROFILE: '/dashboard/profile',
  USER_GAMES: '/dashboard/games',
  USER_HISTORY: '/dashboard/history',
  USER_CONTACT: '/dashboard/contact',
} as const;

export const SESSION_CONFIG = {
  COOKIE_NAME: 'betting-platform-session',
  MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
  SECURE: process.env.NODE_ENV === 'production',
  HTTP_ONLY: true,
  SAME_SITE: 'strict' as const,
};

export const VALIDATION_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 100,
  BET_MIN: 0.01,
  BET_MAX: 10000,
  BALANCE_MAX: 1000000,
} as const;

export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  GAME_ACCESS_DENIED: 'GAME_ACCESS_DENIED',
  INVALID_BET_AMOUNT: 'INVALID_BET_AMOUNT',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;