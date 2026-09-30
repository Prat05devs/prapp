import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';

/** Service-role client (bypasses RLS). Created only via createServiceClient(). */
export type ServiceSupabase = SupabaseClient<Database>;
