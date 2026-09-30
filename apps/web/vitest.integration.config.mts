import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Uses the local Supabase from `supabase start` (keys in the root .env).
process.loadEnvFile(path.resolve(import.meta.dirname, '../../.env'));

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
