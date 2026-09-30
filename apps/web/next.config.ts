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
};

export default nextConfig;
