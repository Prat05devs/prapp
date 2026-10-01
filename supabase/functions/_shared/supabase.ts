import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../packages/db-types/src/database.ts';
import { env, requireEnv } from './env.ts';

function platformSecretKeys(): string[] {
  const keys: string[] = [];
  const single = env('SUPABASE_SECRET_KEY');
  if (single) keys.push(single);

  const encoded = env('SUPABASE_SECRET_KEYS');
  if (encoded) {
    try {
      const named = JSON.parse(encoded) as Record<string, unknown>;
      const preferred = named.default;
      if (typeof preferred === 'string') keys.push(preferred);
      for (const value of Object.values(named)) {
        if (typeof value === 'string') keys.push(value);
      }
    } catch {
      // Fall through to the legacy local-development key below.
    }
  }

  const legacy = env('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) keys.push(legacy);
  return [...new Set(keys)];
}

function requirePlatformSecretKey(): string {
  const key = platformSecretKeys()[0];
  if (!key) throw new Error('Missing Supabase secret key');
  return key;
}

/** Privileged client (Edge Functions are backend: golden rule 3). */
export function serviceClient() {
  return createClient<Database>(requireEnv('SUPABASE_URL'), requirePlatformSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServiceClient = ReturnType<typeof serviceClient>;

/**
 * Only the backend may invoke these functions. Database webhooks, pg_cron and the web
 * server send a Supabase secret API key in the `apikey` header. Exact comparison is
 * required because these service-to-service functions disable the legacy JWT gateway.
 */
export function isServiceCaller(req: Request): boolean {
  const apiKey = req.headers.get('apikey')?.trim();
  if (apiKey && platformSecretKeys().includes(apiKey)) return true;

  // Legacy local callers may still send the service-role JWT as a bearer token.
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return Boolean(bearer && platformSecretKeys().includes(bearer));
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
