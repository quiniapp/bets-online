/**
 * Format number as currency
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format number with decimals
 */
export const formatNumber = (value: number, decimals = 2): string => {
  return value.toFixed(decimals);
};

/**
 * Format chip balance
 */
export const formatChipBalance = (balance: number): string => {
  return `${formatNumber(balance, 2)} chips`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${formatNumber(value, 2)}%`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate string
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
};

/**
 * Format username for display
 */
export const formatUsername = (username: string): string => {
  return username.trim().toLowerCase();
};

/**
 * Generate random string
 */
export const generateRandomString = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Mask sensitive data (email, phone, etc.)
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;
  return `${localPart.slice(0, 2)}***@${domain}`;
};

/**
 * Clean and normalize text
 */
export const normalizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};
