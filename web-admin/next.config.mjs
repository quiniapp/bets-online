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