import { useState } from 'react';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

/** Clears this device's push registration, then revokes the session (LLD §6.3). */
export function useSignOut() {
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    await unregisterPush().catch(() => {});
    await supabase.auth.signOut();
    setPending(false);
  }
  return { pending, signOut };
}
