import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../packages/db-types/src/database.ts';
import { requireEnv } from './env.ts';

/** Service-role client (Edge Functions are backend: golden rule 3). */
export function serviceClient() {
  return createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export type ServiceClient = ReturnType<typeof serviceClient>;

/**
 * Only the backend may invoke these functions (DB webhooks / pg_cron send the service
 * role key). The API gateway verifies the JWT; here we also require the service role.
 */
export function isServiceCaller(req: Request): boolean {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
