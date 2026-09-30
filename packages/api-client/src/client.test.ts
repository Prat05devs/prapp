import { describe, expect, it, vi } from 'vitest';
import { camelize } from './case';
import { ApiError, createRequest } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createRequest', () => {
  it('sends the bearer token and JSON body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    const request = createRequest({
      baseUrl: 'https://example.in/',
      getAccessToken: async () => 'tok',
      fetch: fetchMock,
    });
    await expect(request('/api/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      ok: true,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.in/api/x');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.body).toBe('{"a":1}');
  });

  it('throws ApiError with the server code', async () => {
    const request = createRequest({
      baseUrl: '',
      fetch: async () => jsonResponse(409, { error: { code: 'order_locked', message: 'Locked.' } }),
    });
    const err = await request('/api/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'order_locked', status: 409, message: 'Locked.' });
  });

  it('maps unknown error bodies by status', async () => {
    const request = createRequest({
      baseUrl: '',
      fetch: async () => new Response('nope', { status: 401 }),
    });
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'not_authenticated' });
  });

  it('maps network failures', async () => {
    const request = createRequest({
      baseUrl: '',
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'internal_error', status: 0 });
  });
});

describe('camelize', () => {
  it('converts nested keys', () => {
    expect(camelize({ order_number: 'PR-1', items: [{ live_url: 'x' }], n: null })).toEqual({
      orderNumber: 'PR-1',
      items: [{ liveUrl: 'x' }],
      n: null,
    });
  });
});
