import { z } from 'zod';
import { UserRole, UserStatus } from '../types';

/**
 * Create User Schema
 */
export const createUserSchema = z.object({
  parentUserId: z.string().uuid().optional(),
  role: z.nativeEnum(UserRole),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

/**
 * Update User Schema
 */
export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  status: z.nativeEnum(UserStatus).optional()
});

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
