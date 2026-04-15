import { Session } from 'helper';

interface CacheEntry {
  session: Session;
}

class SessionCache {
  private readonly byToken = new Map<string, CacheEntry>();
  private readonly byRefreshToken = new Map<string, CacheEntry>();

  set(session: Session): void {
    const entry: CacheEntry = { session };
    this.byToken.set(session.token, entry);
    this.byRefreshToken.set(session.refreshToken, entry);
  }

  getByToken(token: string): Session | null {
    const entry = this.byToken.get(token);
    if (!entry) return null;
    if (Date.now() > entry.session.expiresAt.getTime()) {
      this.invalidateByToken(token);
      return null;
    }
    return entry.session;
  }

  getByRefreshToken(refreshToken: string): Session | null {
    const entry = this.byRefreshToken.get(refreshToken);
    if (!entry) return null;
    if (Date.now() > entry.session.expiresAt.getTime()) {
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
      if (now > entry.session.expiresAt.getTime()) {
        this.byRefreshToken.delete(entry.session.refreshToken);
        this.byToken.delete(token);
      }
    }
  }
}

export const sessionCache = new SessionCache();
