'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Polls the server-rendered queue (LLD §10.1: realtime or every 30 s). */
export function AutoRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
