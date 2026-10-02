import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { loadMe } from '@/server/profile';
import { safeNext } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';

const TYPES: EmailOtpType[] = [
  'email',
  'magiclink',
  'signup',
  'invite',
  'recovery',
  'email_change',
];

/**
 * Link in the sign-in email (supabase/templates): verifies the token hash and sets the session
 * cookie. The same email also shows the 6-digit code, so either works (LLD §6.1).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user) {
      const me = await loadMe(supabase, data.user.id).catch(() => null);
      const target =
        me && !me.profileComplete ? `/complete-profile?next=${encodeURIComponent(next)}` : next;
      return NextResponse.redirect(new URL(target, origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', origin));
}
