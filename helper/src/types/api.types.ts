/**
 * Standard API Response Structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: PaginationMeta;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * API Response Builder Class
 */
export class ApiResponseBuilder {
  static success<T>(data: T, meta?: Partial<PaginationMeta>): ApiResponse<T> {
    return {
      success: true,
      data,
      ...(meta && { meta: meta as PaginationMeta })
    };
  }

  static error(code: string, message: string, details?: any): ApiResponse<undefined> {
    return {
      success: false,
      error: { code, message, details }
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

/**
 * Common Error Codes
 */
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_ALREADY_EXISTS = 'GAME_ALREADY_EXISTS',
  BET_NOT_FOUND = 'BET_NOT_FOUND',

  // Business Logic
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_HIERARCHY = 'INVALID_HIERARCHY',
  USER_BLOCKED = 'USER_BLOCKED',
  GAME_INACTIVE = 'GAME_INACTIVE',
  INVALID_BET_AMOUNT = 'INVALID_BET_AMOUNT',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
