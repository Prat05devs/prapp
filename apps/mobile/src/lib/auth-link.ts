import { supabase } from './supabase';

/** Where the sign-in email sends the user back to (allow-listed as newsvio://** in Supabase). */
export const AUTH_CALLBACK_PATH = 'auth-callback';

function params(url: string): URLSearchParams {
  // Implicit flow puts tokens in the #fragment; PKCE puts ?code= in the query.
  const out = new URLSearchParams();
  const hash = url.split('#')[1];
  const query = url.split('#')[0]?.split('?')[1];
  for (const part of [query, hash]) {
    if (!part) continue;
    for (const [k, v] of new URLSearchParams(part)) out.set(k, v);
  }
  return out;
}

/**
 * Completes sign-in from the email link (Supabase's default email has a link, not a code).
 * Returns null when the URL is not a sign-in link, otherwise an error message or 'ok'.
 */
export async function completeSignInFromUrl(url: string | null): Promise<string | null> {
  if (!url || !url.includes(AUTH_CALLBACK_PATH)) return null;
  const p = params(url);
  const error = p.get('error_description') ?? p.get('error');
  if (error) return error.replace(/\+/g, ' ');
  const accessToken = p.get('access_token');
  const refreshToken = p.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: err } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return err ? err.message : 'ok';
  }
  const code = p.get('code');
  if (code) {
    const { error: err } = await supabase.auth.exchangeCodeForSession(code);
    return err ? err.message : 'ok';
  }
  return 'That sign-in link is incomplete. Request a new one.';
}
