import { z } from 'zod';

/**
 * Login Schema
 */
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100)
});

/**
 * Register Schema
 */
export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

/**
 * Change Password Schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword']
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8).max(100)
});

/**
 * Refresh Token Schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
});
