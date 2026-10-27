import type { NextRequest } from 'next/server';
import { updateSession } from '@/server/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static files and images. Webhooks and cron routes carry no
    // session, so they are skipped too.
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt$|sitemap\\.xml$|social-image$|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
