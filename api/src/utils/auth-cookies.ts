import { Response } from 'express';
import { config } from '../config';

/**
 * Centralised auth cookie handling, shared by the auth controller (login /
 * refresh / logout) and the auth middleware (server-side sliding window).
 *
 * Cookies are first-party to the frontend domain because the browser talks to
 * the Next.js app same-origin and Next rewrites `/api/*` to the backend, so
 * `sameSite: 'strict'` is correct.
 */
function cookieBase() {
  const isProd = config.server.env === 'production';
  return { httpOnly: true, secure: isProd, sameSite: 'strict' as const };
}

/** Re-issues only the short-lived access token cookie (used by the sliding window). */
export function setSessionCookie(res: Response, accessToken: string): void {
  res.cookie('session', accessToken, { ...cookieBase(), maxAge: config.jwt.accessTokenMaxAge });
}

/** Sets both the session and the (path-scoped) refresh-token cookies. */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  setSessionCookie(res, accessToken);
  res.cookie('refresh-token', refreshToken, {
    ...cookieBase(),
    maxAge: config.jwt.refreshTokenMaxAge,
    path: '/api/auth/refresh'
  });
}

export function clearAuthCookies(res: Response): void {
  const base = cookieBase();
  res.clearCookie('session', base);
  res.clearCookie('refresh-token', { ...base, path: '/api/auth/refresh' });
}
