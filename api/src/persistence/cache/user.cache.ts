import { User } from 'helper';

// ⚠️ ARCHITECTURAL CONSTRAINT (ISO 27001 A.8.5 / A.5.18 — access revocation):
// This is an IN-MEMORY, PER-PROCESS cache. Immediate revocation of a BLOCKED
// user (auth.middleware checks this cache) and the password-change session kill
// only work because the API runs as a SINGLE instance. If the API is ever
// scaled horizontally, a blocked user could keep passing auth on other nodes
// until their stateless access token expires (≤15 min). Before scaling, move
// this cache / a revocation list to a shared store (e.g. Redis) or add a
// per-user token version checked on each request.
//
// TTL debe ser mayor que la vida del accessToken (15 min) para que los refreshes
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
