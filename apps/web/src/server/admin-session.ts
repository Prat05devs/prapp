import 'server-only';
import { notFound } from 'next/navigation';
import type { MeResponse } from '@prapp/shared';
import { getCurrentUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';

/**
 * Admin layout guard (LLD §10): editors and admins only, everyone else gets a 404.
 * The database checks the role again on every read (RLS) and action (RPC).
 */
export async function requireStaffPage(level: 'editor' | 'admin' = 'editor'): Promise<MeResponse> {
  const me = await getCurrentUser();
  if (!me) notFound();
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', me.id)
    .maybeSingle();
  const active = Boolean(data?.is_active);
  const ok = active && (me.role === 'admin' || (level === 'editor' && me.role === 'editor'));
  if (!ok) notFound();
  return me;
}
