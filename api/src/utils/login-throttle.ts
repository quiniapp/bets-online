import { ErrorCode } from 'helper';
import { AppError } from '../middleware/error.middleware';

/**
 * Per-account login throttle (complements the per-IP authLimiter, which a
 * distributed attack evades and which punishes real users behind CGNAT).
 *
 * First FREE_FAILS attempts are free; beyond that each failure locks the
 * account with exponential backoff: 30s, 1m, 2m, 4m... capped at 30m.
 * Counters reset after 15 minutes without failures. In-memory Map — single
 * instance, same trade-off as userCache.
 */
const FREE_FAILS = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 30 * 60 * 1000;
const RESET_AFTER_MS = 15 * 60 * 1000;

interface ThrottleEntry {
  fails: number;
  lastFailAt: number;
  lockedUntil: number;
}

const entries = new Map<string, ThrottleEntry>();

const keyFor = (username: string): string => username.trim().toLowerCase();

function getLive(username: string): ThrottleEntry | undefined {
  const key = keyFor(username);
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.lastFailAt > RESET_AFTER_MS) {
    entries.delete(key);
    return undefined;
  }
  return entry;
}

/** Throws 429 if the account is currently locked out. Call before checking credentials. */
export function assertLoginAllowed(username: string): void {
  const entry = getLive(username);
  if (!entry) return;
  const remainingMs = entry.lockedUntil - Date.now();
  if (remainingMs > 0) {
    const retrySec = Math.ceil(remainingMs / 1000);
    throw new AppError(
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Too many failed attempts for this account. Retry in ${retrySec}s`
    );
  }
}

export function registerLoginFailure(username: string): void {
  const key = keyFor(username);
  const now = Date.now();
  const entry = getLive(username) ?? { fails: 0, lastFailAt: now, lockedUntil: 0 };
  entry.fails += 1;
  entry.lastFailAt = now;
  if (entry.fails > FREE_FAILS) {
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** (entry.fails - FREE_FAILS - 1), MAX_LOCK_MS);
    entry.lockedUntil = now + lockMs;
  }
  entries.set(key, entry);
}

export function clearLoginFailures(username: string): void {
  entries.delete(keyFor(username));
}
