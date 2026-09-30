import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/server/supabase/server';
import { loadMe } from '@/server/profile';
import { safeNext } from '@/server/session';

/** Google OAuth redirect target (LLD §6.1): exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const me = await loadMe(supabase, data.user.id).catch(() => null);
      const target =
        me && !me.profileComplete ? `/complete-profile?next=${encodeURIComponent(next)}` : next;
      return NextResponse.redirect(new URL(target, origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=callback', origin));
}
