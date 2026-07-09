// Report-Only first: violations land in the browser console without breaking
// anything. Once game-vendor iframe domains are confirmed, tighten frame-src
// and switch the header to Content-Security-Policy.
const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev/HMR additionally needs eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Game thumbnails/banners come from Supabase Storage + several vendor CDNs
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  // Games are embedded in iframes whose vendor domains vary per provider
  "frame-src https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Security headers applied to every response (ISO/IEC 27001:2022 A.8.26).
// CSP stays Report-Only on the players site until vendor iframe domains are
// pinned in frame-src; the rest are safe to enforce now.
const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  // Force HTTPS for 2 years incl. subdomains; eligible for the preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Block MIME-sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // The players site must not be framed by third parties (CSP frame-ancestors
  // 'self' already enforces this; X-Frame-Options covers legacy browsers).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Don't leak full URLs/tokens in the Referer to cross-origin destinations.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable powerful features the app doesn't use (fullscreen left enabled for games).
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`
      }
    ];
  }
}

export default nextConfig