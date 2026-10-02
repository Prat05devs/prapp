import 'server-only';
import { LIMITS, type CheckoutReturn } from '@prapp/shared';
import { hmacSha256Hex, safeEqual } from '@/server/razorpay';

// /pay/<token>: base64url(JSON payload) + "." + HMAC (LLD §9.4 step 5, §15).
// DECISION: the payload also carries `r` (web | app) so the callback knows whether to
// redirect to /orders/:id or to newsvio://payment-result (LLD §9.6 step 4).

export interface CheckoutTokenPayload {
  orderId: string;
  intentId: string;
  /** unix seconds */
  exp: number;
  r: CheckoutReturn;
}

export type TokenCheck =
  | { ok: true; payload: CheckoutTokenPayload }
  | { ok: false; reason: 'invalid' | 'expired'; payload?: CheckoutTokenPayload };

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export function signCheckoutToken(
  input: Omit<CheckoutTokenPayload, 'exp'>,
  secret: string,
  now = Date.now(),
): string {
  const payload: CheckoutTokenPayload = {
    ...input,
    exp: Math.floor(now / 1000) + LIMITS.checkoutTokenTtlSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = Buffer.from(hmacSha256Hex(body, secret), 'hex').toString('base64url');
  return `${body}.${sig}`;
}

export function verifyCheckoutToken(token: string, secret: string, now = Date.now()): TokenCheck {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return { ok: false, reason: 'invalid' };
  const expected = Buffer.from(hmacSha256Hex(body, secret), 'hex').toString('base64url');
  if (!safeEqual(expected, sig)) return { ok: false, reason: 'invalid' };

  let payload: CheckoutTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CheckoutTokenPayload;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (
    typeof payload.orderId !== 'string' ||
    typeof payload.intentId !== 'string' ||
    typeof payload.exp !== 'number' ||
    (payload.r !== 'web' && payload.r !== 'app')
  ) {
    return { ok: false, reason: 'invalid' };
  }
  if (payload.exp * 1000 < now) return { ok: false, reason: 'expired', payload };
  return { ok: true, payload };
}
