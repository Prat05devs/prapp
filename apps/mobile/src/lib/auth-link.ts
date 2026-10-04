import { supabase } from './supabase';

/** Tokens arrive in the #fragment (implicit flow) or ?code= (PKCE) of the reset-password link. */
function params(url: string): URLSearchParams {
  const out = new URLSearchParams();
  const [base = '', hash] = url.split('#');
  const query = base.split('?')[1];
  for (const part of [query, hash]) {
    if (!part) continue;
    for (const [k, v] of new URLSearchParams(part)) out.set(k, v);
  }
  return out;
}

/** Turns a password-reset link into a session. Resolves to an error message or null on success. */
export async function startRecoverySession(url: string | null): Promise<string | null> {
  if (!url) return 'Open the reset link from your email on this phone.';
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
    return err?.message ?? null;
  }
  const code = p.get('code');
  if (code) {
    const { error: err } = await supabase.auth.exchangeCodeForSession(code);
    return err?.message ?? null;
  }
  return 'That reset link is incomplete or has expired. Request a new one.';
}
