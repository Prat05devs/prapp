import 'server-only';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@prapp/shared';
import { createServerSupabase } from '@/server/supabase/server';
import { loadMe } from '@/server/profile';

/** Only allow same-site relative redirects (no open redirect via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : fallback;
}

/** Current user for Server Components, or null. */
export async function getCurrentUser(): Promise<MeResponse | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return loadMe(supabase, data.user.id);
}

/**
 * For customer pages: signed in AND profile complete (LLD §6.2), otherwise
 * redirect to /login or /complete-profile and come back to `path` afterwards.
 */
export async function requireCompleteUser(path: string): Promise<MeResponse> {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!me.profileComplete) redirect(`/complete-profile?next=${encodeURIComponent(path)}`);
  return me;
}
