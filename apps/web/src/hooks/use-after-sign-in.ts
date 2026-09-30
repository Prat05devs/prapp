'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/** After sign-in: incomplete profiles go to /complete-profile first (LLD §6.2). */
export function useAfterSignIn(next: string) {
  const router = useRouter();
  return async function continueAfterSignIn() {
    const me = await api.me.get().catch(() => null);
    const target =
      me && !me.profileComplete ? `/complete-profile?next=${encodeURIComponent(next)}` : next;
    router.replace(target);
    router.refresh();
  };
}
