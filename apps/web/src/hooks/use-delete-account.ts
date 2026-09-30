'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@prapp/api-client';
import { api } from '@/lib/api';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/** DELETE /api/me, then sign out locally (LLD §6.5). */
export function useDeleteAccount() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setPending(true);
    setError(null);
    try {
      await api.me.delete();
      await createBrowserSupabase().auth.signOut({ scope: 'local' });
      router.replace('/');
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete your account.');
      setPending(false);
    }
  }

  return { pending, error, deleteAccount };
}
