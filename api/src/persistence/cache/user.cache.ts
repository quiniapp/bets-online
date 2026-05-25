import { User } from 'helper';

// Debe ser mayor que la vida del accessToken (15 min) para que los refreshes
// encuentren el usuario en caché sin ir a DB mientras el usuario está activo.
const TTL_MS = 20 * 60 * 1000; // 20 minutes

interface CacheEntry {
  user: User;
  expiresAt: number;
}

class UserCache {
  private readonly cache = new Map<string, CacheEntry>();

  set(user: User): void {
    this.cache.set(user.id, {
      user,
      expiresAt: Date.now() + TTL_MS
    });
  }

  get(userId: string): User | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.user;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const userCache = new UserCache();
