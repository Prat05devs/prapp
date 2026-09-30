'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/** signOut() revokes the refresh token server-side (LLD §6.3). */
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    await createBrowserSupabase().auth.signOut();
    router.replace('/');
    router.refresh();
  }
  return { pending, signOut };
}
