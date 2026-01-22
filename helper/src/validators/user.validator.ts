import { z } from 'zod';
import { UserRole, UserStatus } from '../types';

/**
 * Password validation regex:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

/**
 * Create User Schema
 */
export const createUserSchema = z.object({
  parentUserId: z.string().uuid().optional(),
  role: z.nativeEnum(UserRole),
  username: z.string().min(3).max(50),
  email: z.string().email().optional().or(z.literal('')),
  firstName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().max(100).optional().or(z.literal('')),
  password: passwordSchema
});

/**
 * Update User Schema
 */
export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  firstName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().max(100).optional().or(z.literal('')),
  status: z.nativeEnum(UserStatus).optional()
});

/**
 * Password validation helper for frontend
 */
export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true
};

/**
 * Validate password and return specific errors
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
  };
} {
  return {
    isValid: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password),
    errors: {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password)
    }
  };
}

/**
 * Block User Schema
 */
export const blockUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional()
});

/**
 * Create Cashier Schema (extends create user)
 */
export const createCashierSchema = createUserSchema.extend({
  role: z.literal(UserRole.CASHIER),
  compensationType: z.enum(['PERCENTAGE', 'PANEL']),
  percentage: z.number().min(0).max(100).optional(),
  chipBuyPrice: z.number().min(0).optional(),
  chipSellPrice: z.number().min(0).optional()
}).refine(
  data => {
    if (data.compensationType === 'PERCENTAGE') {
      return data.percentage !== undefined;
    }
    return true;
  },
  {
    message: 'Percentage is required for PERCENTAGE compensation type',
    path: ['percentage']
  }
).refine(
  data => {
    if (data.compensationType === 'PANEL') {
      return data.chipBuyPrice !== undefined && data.chipSellPrice !== undefined;
    }
    return true;
  },
  {
    message: 'Buy and sell prices are required for PANEL compensation type',
    path: ['chipBuyPrice']
  }
);
