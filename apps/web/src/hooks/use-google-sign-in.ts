'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/** Google OAuth redirect flow; /auth/callback finishes it (LLD §6.1). */
export function useGoogleSignIn(next: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) {
      setPending(false);
      setError(err.message);
    }
  }

  return { pending, error, signInWithGoogle };
}
