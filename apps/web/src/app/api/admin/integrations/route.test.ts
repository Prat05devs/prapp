import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as IntegrationModule from '@/server/integrations';
import { AppError } from '@/server/api';

const mocks = vi.hoisted(() => ({
  staff: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  activate: vi.fn(),
}));
vi.mock('@/server/staff', () => ({ requireStaff: mocks.staff }));
vi.mock('@/server/integrations', async (original) => ({
  ...(await original<typeof IntegrationModule>()),
  listIntegrations: mocks.list,
  saveIntegration: mocks.save,
  activateIntegration: mocks.activate,
}));
const { GET, POST, PATCH } = await import('./route');
const id = '11111111-1111-4111-8111-111111111111';
function req(method: string, body?: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/admin/integrations', {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  mocks.staff.mockResolvedValue({ user: { id }, role: 'admin' });
  mocks.list.mockResolvedValue([]);
  mocks.save.mockResolvedValue(id);
  mocks.activate.mockResolvedValue(undefined);
});
describe('admin integration boundary', () => {
  it('lists only through the admin guard and disables response caching', async () => {
    const res = await GET(req('GET'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.staff).toHaveBeenCalledWith(expect.any(Request), 'admin');
  });
  it.each(['not_authenticated', 'not_authorized'] as const)(
    'blocks %s for every operation',
    async (code) => {
      mocks.staff.mockRejectedValue(new AppError(code));
      for (const [method, handler] of [
        ['GET', GET],
        ['POST', POST],
        ['PATCH', PATCH],
      ] as const) {
        const res = await handler(req(method, method === 'GET' ? undefined : { id }));
        expect(res.status).toBe(code === 'not_authenticated' ? 401 : 403);
      }
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.save).not.toHaveBeenCalled();
      expect(mocks.activate).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid input and cross-origin changes', async () => {
    expect((await POST(req('POST', {}))).status).toBe(422);
    expect((await PATCH(req('PATCH', { id }, 'https://attacker.example'))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.activate).not.toHaveBeenCalled();
  });
  it('saves live keys without activating them or returning secrets', async () => {
    const body = {
      provider: 'razorpay',
      label: 'Live',
      environment: 'live',
      keyId: 'rzp_live_example',
      keySecret: 'a-secret-long-enough',
      webhookSecret: 'a-webhook-secret-long-enough',
    };
    const res = await POST(req('POST', body));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id });
    expect(mocks.save).toHaveBeenCalledWith(id, body);
    expect(mocks.activate).not.toHaveBeenCalled();
    expect((await POST(req('POST', { ...body, environment: 'test' }))).status).toBe(422);
  });
  it('activates only a validated configuration id', async () => {
    expect((await PATCH(req('PATCH', { id }))).status).toBe(200);
    expect(mocks.activate).toHaveBeenCalledWith(id, id);
  });
});
