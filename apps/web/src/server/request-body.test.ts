import { describe, expect, it } from 'vitest';
import { readLimitedText, RequestBodyTooLarge } from './request-body';

describe('untrusted request body limits', () => {
  it('preserves whitespace and Unicode used in webhook signatures', async () => {
    const raw = ' {"text":"हिन्दी"}\n';
    const req = new Request('https://local.test', { method: 'POST', body: raw });
    expect(await readLimitedText(req, 256)).toBe(raw);
  });
  it('rejects a declared oversize body', async () => {
    const req = new Request('https://local.test', {
      method: 'POST',
      body: '{}',
      headers: { 'content-length': '10000' },
    });
    await expect(readLimitedText(req, 64)).rejects.toBeInstanceOf(RequestBodyTooLarge);
  });
  it.each([undefined, '1'])('limits streamed bytes with Content-Length=%s', async (length) => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(40));
      },
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request('https://local.test', {
      method: 'POST',
      body,
      duplex: 'half',
      headers: length ? { 'content-length': length } : {},
    } as RequestInit);
    await expect(readLimitedText(req, 64)).rejects.toBeInstanceOf(RequestBodyTooLarge);
    expect(cancelled).toBe(true);
  });
});
