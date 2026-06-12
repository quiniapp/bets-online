import { Request, Response } from 'express';

/**
 * Cache headers for public GET endpoints. Lets the browser reuse the response
 * and lets the Vercel edge (which proxies /api/* to Railway) cache it, removing
 * the Vercel→Railway hop for cache hits.
 *
 * Only anonymous requests get `public` — authenticated responses may contain
 * role-specific data (e.g. rtp for OWNER, per-owner casino settings) and must
 * never land in a shared cache.
 */
export function setPublicCache(
  req: Request,
  res: Response,
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds = 600
): void {
  if (req.user) {
    res.set('Cache-Control', 'private, no-store');
    return;
  }
  res.set(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`
  );
}
