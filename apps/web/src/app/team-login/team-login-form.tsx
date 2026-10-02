'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffLoginSchema } from '@prapp/shared';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function TeamLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-hairline bg-subtle p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = staffLoginSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Check your details');
          return;
        }
        setPending(true);
        setError(null);
        void createBrowserSupabase()
          .auth.signInWithPassword(parsed.data)
          .then(({ error: err }) => {
            if (err) {
              setPending(false);
              setError('That email and password do not match a team account.');
              return;
            }
            router.replace('/admin');
            router.refresh();
          });
      }}
    >
      <Field label="Email">
        <Input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" variant="accent" size="lg" disabled={pending}>
        Log in to the dashboard
      </Button>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
