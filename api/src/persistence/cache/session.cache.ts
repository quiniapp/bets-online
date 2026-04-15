import { Session } from 'helper';

// TTL independiente del expiresAt de la sesión.
// El refresh token se usa cada ~15 min (cuando vence el access token),
// así que 30 min cubre varios ciclos sin acumular semanas de sesiones en memoria.
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  session: Session;
  cachedUntil: number;
}

class SessionCache {
  private readonly byToken = new Map<string, CacheEntry>();
  private readonly byRefreshToken = new Map<string, CacheEntry>();

  set(session: Session): void {
    const entry: CacheEntry = { session, cachedUntil: Date.now() + CACHE_TTL_MS };
    this.byToken.set(session.token, entry);
    this.byRefreshToken.set(session.refreshToken, entry);
  }

  getByToken(token: string): Session | null {
    const entry = this.byToken.get(token);
    if (!entry) return null;
    if (Date.now() > entry.cachedUntil) {
      this.invalidateByToken(token);
      return null;
    }
    return entry.session;
  }

  getByRefreshToken(refreshToken: string): Session | null {
    const entry = this.byRefreshToken.get(refreshToken);
    if (!entry) return null;
    if (Date.now() > entry.cachedUntil) {
      this.invalidateByToken(entry.session.token);
      return null;
    }
    return entry.session;
  }

  invalidateByToken(token: string): void {
    const entry = this.byToken.get(token);
    if (entry) {
      this.byRefreshToken.delete(entry.session.refreshToken);
    }
    this.byToken.delete(token);
  }

  invalidateByUserId(userId: string): void {
    for (const [token, entry] of this.byToken.entries()) {
      if (entry.session.userId === userId) {
        this.byRefreshToken.delete(entry.session.refreshToken);
        this.byToken.delete(token);
      }
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [token, entry] of this.byToken.entries()) {
      if (now > entry.cachedUntil) {
        this.byRefreshToken.delete(entry.session.refreshToken);
        this.byToken.delete(token);
      }
    }
  }
}

export const sessionCache = new SessionCache();
