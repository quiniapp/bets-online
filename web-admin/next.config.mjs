// Report-Only first: violations land in the browser console without breaking
// anything. The admin embeds no third-party iframes, so this can be promoted
// to an enforced Content-Security-Policy sooner than the players site.
const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev/HMR additionally needs eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Logos/banners come from Supabase Storage + vendor CDNs
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Security headers applied to every response (ISO/IEC 27001:2022 A.8.26).
// The admin embeds no third-party iframes, scripts, fonts or CDNs, so the CSP
// is ENFORCED here (not Report-Only) — verified: no external resources.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Force HTTPS for 2 years incl. subdomains; eligible for the preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Block MIME-sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // The admin must never be framed (CSP frame-ancestors 'none' + legacy header).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't leak full URLs/tokens in the Referer to cross-origin destinations.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable powerful browser features the admin does not use.
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