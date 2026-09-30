'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data: { deep_link?: string } | null;
  read_at: string | null;
  created_at: string;
}

/** In-app notification list; marking read writes only read_at (column grant). */
export function useNotifications(initial: NotificationItem[]) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)),
    );
    await createBrowserSupabase()
      .from('notifications')
      .update({ read_at: now })
      .in('id', ids)
      .is('read_at', null);
    router.refresh();
  }

  return { items, unread: items.filter((n) => !n.read_at).length, markRead };
}
