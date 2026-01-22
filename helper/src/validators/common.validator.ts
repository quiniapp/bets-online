import { z } from 'zod';

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * UUID Schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Date Range Schema
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
});

/**
 * ID Parameter Schema
 */
export const idParamSchema = z.object({
  id: uuidSchema
});
