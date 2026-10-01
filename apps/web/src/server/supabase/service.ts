import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';
import { publicEnv } from '@/lib/env';
import { supabaseServerEnv } from '@/server/env';

/**
 * Service-role client: bypasses RLS. Only for backend-only work (svc_* RPCs,
 * storage the user cannot touch). Never pass its results to the client unfiltered.
 */
export function createServiceClient() {
  return createClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    supabaseServerEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
