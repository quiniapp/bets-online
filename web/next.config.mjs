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

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy-Report-Only', value: csp }],
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