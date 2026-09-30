import { describe, expect, it } from 'vitest';
import { signCheckoutToken, verifyCheckoutToken } from './checkout-token';

const SECRET = 's'.repeat(40);
const input = { orderId: 'o1', intentId: 'i1', r: 'web' as const };

describe('checkout token', () => {
  it('round-trips', () => {
    const t = signCheckoutToken(input, SECRET, 1_000_000);
    expect(verifyCheckoutToken(t, SECRET, 1_000_000)).toEqual({
      ok: true,
      payload: { ...input, exp: 1000 + 1800 },
    });
  });
  it('expires after 30 minutes', () => {
    const t = signCheckoutToken(input, SECRET, 0);
    expect(verifyCheckoutToken(t, SECRET, 1_800_000).ok).toBe(true);
    expect(verifyCheckoutToken(t, SECRET, 1_801_000)).toMatchObject({
      ok: false,
      reason: 'expired',
    });
  });
  it('rejects tampering and other secrets', () => {
    const t = signCheckoutToken(input, SECRET);
    const [body, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ ...input, orderId: 'o2', exp: 9e9 })).toString(
      'base64url',
    );
    expect(verifyCheckoutToken(`${forged}.${sig}`, SECRET).ok).toBe(false);
    expect(verifyCheckoutToken(t, 'x'.repeat(40)).ok).toBe(false);
    expect(verifyCheckoutToken(`${body}`, SECRET).ok).toBe(false);
    expect(verifyCheckoutToken('garbage', SECRET).ok).toBe(false);
  });
});
