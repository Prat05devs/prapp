import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { noteValue, verifyPaymentSignature, verifyWebhookSignature } from './razorpay';

const hmac = (d: string, s: string) => createHmac('sha256', s).update(d).digest('hex');

describe('Razorpay signatures', () => {
  it('verifies the checkout signature over order_id|payment_id', () => {
    const sig = hmac('order_1|pay_1', 'secret');
    expect(verifyPaymentSignature('order_1', 'pay_1', sig, 'secret')).toBe(true);
    expect(verifyPaymentSignature('order_1', 'pay_2', sig, 'secret')).toBe(false);
    expect(verifyPaymentSignature('order_1', 'pay_1', 'short', 'secret')).toBe(false);
  });
  it('verifies the webhook signature over the raw body', () => {
    const raw = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(raw, hmac(raw, 'wh'), 'wh')).toBe(true);
    expect(verifyWebhookSignature(`${raw} `, hmac(raw, 'wh'), 'wh')).toBe(false);
  });
  it('reads notes, which Razorpay sends as [] when empty', () => {
    expect(noteValue({ app: 'prapp' }, 'app')).toBe('prapp');
    expect(noteValue([], 'app')).toBeUndefined();
    expect(noteValue(undefined, 'app')).toBeUndefined();
  });
});
