import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';
import { publicEnv } from '@/lib/env';
import { AppError } from '@/server/api';
import { createServerSupabase } from '@/server/supabase/server';

export type UserSupabase = SupabaseClient<Database>;

export interface RequestAuth {
  supabase: UserSupabase;
  user: User;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * Identifies the caller of an /api route and returns a user-scoped client (RLS applies).
 * Mobile sends `Authorization: Bearer <access token>`; web sends session cookies.
 * Returns null when nobody is signed in.
 */
export async function getRequestAuth(req: Request): Promise<RequestAuth | null> {
  const token = bearerToken(req);
  if (token) {
    const env = publicEnv();
    const supabase = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    );
    const { data, error } = await supabase.auth.getUser(token);
    return error || !data.user ? null : { supabase, user: data.user };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function requireRequestAuth(req: Request): Promise<RequestAuth> {
  const auth = await getRequestAuth(req);
  if (!auth) throw new AppError('not_authenticated');
  return auth;
}
