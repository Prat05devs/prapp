import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // 'server-only' throws outside a React Server Components bundle.
      'server-only': path.resolve(import.meta.dirname, 'src/test/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    // Integration tests need `supabase start`; run them with `pnpm test:integration`.
    exclude: ['**/node_modules/**', 'src/test/integration/**'],
  },
});
