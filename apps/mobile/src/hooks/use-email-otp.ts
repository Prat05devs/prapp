import { useState } from 'react';
import { APP_SCHEME, emailOtpRequestSchema, emailOtpVerifySchema } from '@prapp/shared';
import { AUTH_CALLBACK_PATH } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

export type AuthMode = 'login' | 'signup';

/**
 * Email OTP sign-in (LLD §6.1). The auth listener picks up the new session. 'login' only works
 * for an existing account; 'signup' creates one if needed.
 */
export function useEmailOtp() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(rawEmail: string, mode: AuthMode = 'signup'): Promise<string | null> {
    const parsed = emailOtpRequestSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return null;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: mode === 'signup',
        // Supabase's default email has a sign-in link; it opens the app and signs in.
        emailRedirectTo: `${APP_SCHEME}://${AUTH_CALLBACK_PATH}`,
      },
    });
    setPending(false);
    if (err) {
      // GoTrue answers 'otp_disabled' / 'Signups not allowed for otp' for an unknown email.
      const unknown = err.code === 'otp_disabled' || /signups not allowed/i.test(err.message);
      setError(
        mode === 'login' && unknown
          ? 'No account uses this email yet. Choose “Create account” instead.'
          : err.message,
      );
      return null;
    }
    return parsed.data.email;
  }

  async function verifyCode(email: string, token: string): Promise<boolean> {
    const parsed = emailOtpVerifySchema.safeParse({ email, token });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
      return false;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ ...parsed.data, type: 'email' });
    setPending(false);
    if (err) {
      setError('That code is wrong or has expired. Try again or request a new one.');
      return false;
    }
    return true;
  }

  return { pending, error, requestCode, verifyCode };
}
