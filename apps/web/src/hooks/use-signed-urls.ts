'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** Thumbnail URLs for private order images (1 h signed URLs from GET /api/orders/:id/edit). */
export function useSignedUrls(orderId: string, paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join('|');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api.orders.edit(orderId).then(
      (r) => {
        if (!cancelled) setUrls(r.imageUrls);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [orderId, key]);
  return urls;
}
