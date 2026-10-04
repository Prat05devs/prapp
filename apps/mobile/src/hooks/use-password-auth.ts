import { useState } from 'react';
import {
  APP_SCHEME,
  customerLoginSchema,
  customerSignupSchema,
  emailSchema,
  otpSchema,
} from '@prapp/shared';
import { supabase } from '@/lib/supabase';

export type AuthMode = 'login' | 'signup';

/**
 * Email + password auth against Supabase. On success the auth listener picks up the session and
 * the root guard leaves the sign-in screen.
 *
 * New accounts confirm their email with the 6-digit code from the sign-up email (Auth → "Confirm
 * email" on). Without that step anyone could create a password login on someone else's address
 * and keep access after the real owner signs in with a code or Google (security review, Oct 2026).
 * With confirmation off, sign-up returns a session straight away and the code step is skipped.
 */
export function usePasswordAuth() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set while we wait for the sign-up code sent to this address. */
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function submit(mode: AuthMode, email: string, password: string) {
    const schema = mode === 'signup' ? customerSignupSchema : customerLoginSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your email and password');
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp(parsed.data);
        if (err) {
          setError(
            err.code === 'user_already_exists'
              ? 'This email already has an account. Log in instead.'
              : err.message,
          );
        } else if (!data.session) {
          // No identities: the address already has a confirmed account (no email is sent).
          if (data.user && data.user.identities?.length === 0) {
            setError('This email already has an account. Log in instead.');
          } else {
            setConfirmEmail(parsed.data.email);
          }
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword(parsed.data);
        if (err?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: parsed.data.email });
          setConfirmEmail(parsed.data.email);
        } else if (err) {
          setError(err.code === 'invalid_credentials' ? 'Wrong email or password.' : err.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  /** Confirms the new account with the code from the sign-up email; the session follows. */
  async function verifyCode(code: string) {
    const parsed = otpSchema.safeParse(code);
    if (!confirmEmail || !parsed.success) {
      setError(
        parsed.success ? 'Start again from Create account.' : parsed.error.issues[0]!.message,
      );
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: confirmEmail,
      token: parsed.data,
      type: 'email',
    });
    setPending(false);
    if (err)
      setError('That code is wrong or has expired. Check the latest email, or send a new one.');
  }

  async function resendCode(): Promise<boolean> {
    if (!confirmEmail) return false;
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: confirmEmail });
    setPending(false);
    if (err) setError(err.message);
    return !err;
  }

  /** Emails a reset link that opens newsvio://reset-password (allow-listed as newsvio://**). */
  async function sendReset(email: string): Promise<boolean> {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return false;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${APP_SCHEME}://reset-password`,
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  return {
    pending,
    error,
    confirmEmail,
    submit,
    verifyCode,
    resendCode,
    cancelConfirm: () => setConfirmEmail(null),
    sendReset,
    setError,
  };
}
