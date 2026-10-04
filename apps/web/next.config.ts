import type { NextConfig } from 'next';

// Env: one .env at the repo root, loaded by the package scripts (dotenv -e ../../.env) so every
// Next.js process sees it. apps/web/.env.local still works. On Vercel, set them in the dashboard.

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: [
    '@prapp/shared',
    '@prapp/api-client',
    '@prapp/db-types',
    '@prapp/report-templates',
    '@prapp/fact-check',
  ],
  // Rendered with Node APIs in route handlers (PDF), keep them out of the bundle.
  serverExternalPackages: ['@react-pdf/renderer'],
  poweredByHeader: false,
  // Security review (Oct 2026): nothing of ours is meant to be framed (the admin panel least of
  // all), so clickjacking is blocked everywhere. A script CSP is left out on purpose: the Razorpay
  // checkout script and Next's inline scripts would need nonces first.
  headers: async () => [
    ...[
      '/login',
      '/team-login',
      '/complete-profile',
      '/account',
      '/orders',
      '/admin',
      '/pay',
      '/api',
      '/auth',
    ].map((path) => ({
      source: `${path}/:path*`,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    })),
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
        },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};

export default nextConfig;
