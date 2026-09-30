import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase, stubPublicEnv } from '@/test/fake-supabase';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServerSupabase: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/server/supabase/server', () => ({ createServerSupabase: mocks.createServerSupabase }));

const { GET } = await import('./route');

const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'a@x.in' };
const PROFILE = {
  id: USER.id,
  full_name: 'Asha Rawat',
  email: 'a@x.in',
  phone: '+919876543210',
  role: 'user',
};

beforeEach(() => {
  vi.clearAllMocks();
  stubPublicEnv();
});

describe('GET /api/me', () => {
  it('returns the profile for a Bearer token (mobile)', async () => {
    const sb = fakeSupabase({ user: USER, profile: PROFILE });
    mocks.createClient.mockReturnValue(sb);
    const res = await GET(
      new Request('http://localhost/api/me', { headers: { Authorization: 'Bearer tok' } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: USER.id,
      fullName: 'Asha Rawat',
      email: 'a@x.in',
      phone: '+919876543210',
      role: 'user',
      profileComplete: true,
    });
    expect(sb.auth.getUser).toHaveBeenCalledWith('tok');
    // user-scoped client: the token is forwarded so RLS applies
    expect(mocks.createClient.mock.calls[0]?.[2]).toMatchObject({
      global: { headers: { Authorization: 'Bearer tok' } },
    });
    expect(mocks.createServerSupabase).not.toHaveBeenCalled();
  });

  it('uses the cookie session when there is no Bearer token (web)', async () => {
    mocks.createServerSupabase.mockResolvedValue(
      fakeSupabase({ user: USER, profile: { ...PROFILE, phone: null } }),
    );
    const res = await GET(new Request('http://localhost/api/me'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ phone: null, profileComplete: false });
  });

  it('401 when not signed in', async () => {
    mocks.createServerSupabase.mockResolvedValue(fakeSupabase({ user: null }));
    const res = await GET(new Request('http://localhost/api/me'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'not_authenticated', message: 'Please sign in to continue.' },
    });
  });

  it('401 for an invalid Bearer token', async () => {
    mocks.createClient.mockReturnValue(fakeSupabase({ user: null }));
    const res = await GET(
      new Request('http://localhost/api/me', { headers: { Authorization: 'Bearer bad' } }),
    );
    expect(res.status).toBe(401);
  });

  it('404 when the profile row is missing', async () => {
    mocks.createServerSupabase.mockResolvedValue(fakeSupabase({ user: USER, profile: null }));
    const res = await GET(new Request('http://localhost/api/me'));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('user_not_found');
  });

  it('500 without leaking the DB error', async () => {
    mocks.createServerSupabase.mockResolvedValue(
      fakeSupabase({ user: USER, profileError: { code: 'XX000', message: 'secret detail' } }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(new Request('http://localhost/api/me'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret detail');
  });
});
