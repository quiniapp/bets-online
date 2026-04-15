import { User } from 'helper';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

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
