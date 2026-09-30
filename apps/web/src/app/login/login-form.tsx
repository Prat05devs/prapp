'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { Button, ErrorText, Field, Input, Separator } from '@/components/ui';
import { useAfterSignIn } from '@/hooks/use-after-sign-in';
import { useEmailOtp } from '@/hooks/use-email-otp';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';

export function LoginForm({ next }: { next: string }) {
  const otp = useEmailOtp();
  const google = useGoogleSignIn(next);
  const continueAfterSignIn = useAfterSignIn(next);
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-hairline bg-subtle p-5 sm:p-6">
        {otp.step === 'email' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void otp.requestCode(emailInput);
            }}
          >
            <Field label="Email" hint="We'll email you a 6-digit code. No password needed.">
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="accent" size="lg" disabled={otp.pending}>
              Send code <Icon name="arrow_forward" />
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void otp.verifyCode(code).then(async (ok) => {
                if (ok) await continueAfterSignIn();
              });
            }}
          >
            <p className="flex items-start gap-2 text-body-sm text-body">
              <Icon name="mail" size={16} className="mt-0.5 text-emerald-strong" />
              <span>
                We sent a 6-digit code to <strong className="text-ink">{otp.email}</strong>. It
                expires in 10 minutes.
              </span>
            </p>
            <Field label="Code">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="h-14 text-center font-mono text-headline-sm tracking-[0.5em]"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </Field>
            <Button type="submit" variant="accent" size="lg" disabled={otp.pending}>
              Verify and sign in
            </Button>
            <Button type="button" variant="ghost" onClick={otp.changeEmail}>
              Use a different email
            </Button>
          </form>
        )}
        <ErrorText>{otp.error}</ErrorText>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="font-mono text-code text-faint uppercase">Or continue with</span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={google.signInWithGoogle}
        disabled={google.pending}
      >
        Continue with Google
      </Button>
      <ErrorText>{google.error}</ErrorText>
    </div>
  );
}
