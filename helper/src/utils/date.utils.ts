import dayjs = require('dayjs');
import utc = require('dayjs/plugin/utc');
import timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Format date to string
 */
export const formatDate = (date: string | Date, format = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date, format = 'DD/MM/YYYY HH:mm:ss'): string => {
  return dayjs(date).format(format);
};

/**
 * Get start of week
 */
export const getStartOfWeek = (date?: Date): Date => {
  return dayjs(date).startOf('week').toDate();
};

/**
 * Get end of week
 */
export const getEndOfWeek = (date?: Date): Date => {
  return dayjs(date).endOf('week').toDate();
};

/**
 * Get start of day
 */
export const getStartOfDay = (date?: Date): Date => {
  return dayjs(date).startOf('day').toDate();
};

/**
 * Get end of day
 */
export const getEndOfDay = (date?: Date): Date => {
  return dayjs(date).endOf('day').toDate();
};

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  return dayjs(date).add(days, 'day').toDate();
};

/**
 * Subtract days from date
 */
export const subtractDays = (date: Date, days: number): Date => {
  return dayjs(date).subtract(days, 'day').toDate();
};

/**
 * Check if date is before another date
 */
export const isBefore = (date: Date, compareDate: Date): boolean => {
  return dayjs(date).isBefore(compareDate);
};

/**
 * Check if date is after another date
 */
export const isAfter = (date: Date, compareDate: Date): boolean => {
  return dayjs(date).isAfter(compareDate);
};

/**
 * Get current timestamp
 */
export const now = (): Date => {
  return new Date();
};

/**
 * Parse date string
 */
export const parseDate = (dateString: string): Date => {
  return dayjs(dateString).toDate();
};
