import { UserRole } from '../types';
import { ROLE_HIERARCHY } from '../constants';

/**
 * Check if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if UUID is valid
 */
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Check if password meets requirements
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && password.length <= 100;
};

/**
 * Check if username meets requirements
 */
export const isValidUsername = (username: string): boolean => {
  return username.length >= 3 && username.length <= 50;
};

/**
 * Check if amount is positive
 */
export const isPositiveAmount = (amount: number): boolean => {
  return amount > 0;
};

/**
 * Check if user has higher or equal role
 */
export const hasHigherOrEqualRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user can manage another user (based on hierarchy)
 */
export const canManageUser = (managerRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
};

/**
 * Check if number is within range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
