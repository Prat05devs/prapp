'use client';

import { useEffect, useState } from 'react';
import { signedImageUrls } from '@prapp/api-client';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/** Thumbnail URLs for private order images (1 h signed URLs). */
export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join('|');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    signedImageUrls(createBrowserSupabase(), key.split('|')).then(
      (next) => {
        if (!cancelled) setUrls(next);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  return urls;
}
