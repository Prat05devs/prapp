'use client';

import { useState } from 'react';
import { emailOtpRequestSchema, emailOtpVerifySchema } from '@prapp/shared';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Step = 'email' | 'code';
export type AuthMode = 'login' | 'signup';

/**
 * Email OTP sign-in (LLD §6.1): send a 6-digit code, then verify it. 'login' only works for an
 * existing account; 'signup' creates one if needed (signing in when it already exists).
 */
export function useEmailOtp() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(rawEmail: string, mode: AuthMode = 'signup'): Promise<boolean> {
    const parsed = emailOtpRequestSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return false;
    }
    setPending(true);
    setError(null);
    const { error: err } = await createBrowserSupabase().auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: mode === 'signup',
        // Default Supabase emails carry a link instead of the code; it lands on /auth/callback.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname === '/login'
            ? (new URLSearchParams(window.location.search).get('next') ?? '/')
            : window.location.pathname,
        )}`,
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
      return false;
    }
    setEmail(parsed.data.email);
    setStep('code');
    return true;
  }

  async function verifyCode(token: string): Promise<boolean> {
    const parsed = emailOtpVerifySchema.safeParse({ email, token });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
      return false;
    }
    setPending(true);
    setError(null);
    const { error: err } = await createBrowserSupabase().auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: 'email',
    });
    setPending(false);
    if (err) {
      setError('That code is wrong or has expired. Try again or request a new one.');
      return false;
    }
    return true;
  }

  function changeEmail() {
    setStep('email');
    setError(null);
  }

  return { step, email, pending, error, requestCode, verifyCode, changeEmail };
}
