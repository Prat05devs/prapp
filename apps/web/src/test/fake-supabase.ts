import { vi } from 'vitest';

export interface FakeUser {
  id: string;
  email?: string;
}

interface FakeOptions {
  user?: FakeUser | null;
  profile?: Record<string, unknown> | null;
  profileError?: { code: string; message: string } | null;
}

/** Just enough of SupabaseClient for auth.getUser() and profiles.select().eq().maybeSingle(). */
export function fakeSupabase({ user = null, profile = null, profileError = null }: FakeOptions) {
  const maybeSingle = vi.fn(async () => ({ data: profile, error: profileError }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    auth: {
      getUser: vi.fn(async () =>
        user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } },
      ),
    },
    from: vi.fn(() => ({ select })),
    spies: { select, eq, maybeSingle },
  };
}

export function stubPublicEnv() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
}
