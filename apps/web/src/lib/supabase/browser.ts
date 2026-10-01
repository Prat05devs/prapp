import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@prapp/db-types';
import { publicEnv } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Supabase client for Client Components (cookie session, RLS applies). */
export function createBrowserSupabase() {
  const env = publicEnv();
  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return client;
}
