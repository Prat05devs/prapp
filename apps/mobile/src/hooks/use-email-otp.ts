import { useState } from 'react';
import { emailOtpRequestSchema, emailOtpVerifySchema } from '@prapp/shared';
import { supabase } from '@/lib/supabase';

/** Email OTP sign-in (LLD §6.1). The auth listener picks up the new session. */
export function useEmailOtp() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(rawEmail: string): Promise<string | null> {
    const parsed = emailOtpRequestSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return null;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: true },
    });
    setPending(false);
    if (err) {
      setError(err.message);
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
