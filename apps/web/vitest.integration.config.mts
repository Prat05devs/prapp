import { execSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Uses the local Supabase from `supabase start`. The root .env may point at the hosted project,
// so the Supabase URL and keys always come from `supabase status`, and the run refuses to
// touch anything that is not local (these tests create users and orders).
const root = path.resolve(import.meta.dirname, '../..');
process.loadEnvFile(path.join(root, '.env'));

const local = Object.fromEntries(
  execSync('pnpm exec supabase status -o env', { cwd: root, encoding: 'utf8' })
    .split('\n')
    .map((line) => /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [m[1], m[2]]),
) as Record<string, string | undefined>;

process.env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local.PUBLISHABLE_KEY ?? local.ANON_KEY;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = local.ANON_KEY;
process.env.SUPABASE_SECRET_KEY = local.SECRET_KEY ?? local.SERVICE_ROLE_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://invalid').hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Integration tests only run against local Supabase, not ${host}.`);
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'server-only': path.resolve(import.meta.dirname, 'src/test/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/test/integration/**/*.test.ts'],
    globalSetup: ['./src/test/integration/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    teardownTimeout: 60_000,
  },
});
