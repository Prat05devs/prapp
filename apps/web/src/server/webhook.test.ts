import { describe, expect, it, vi } from 'vitest';
import { handleRazorpayWebhook, processPaymentWebhooks } from './webhook';
import { hmacSha256Hex, type RazorpayGateway } from './razorpay';
import type { ServiceSupabase } from './service-types';

const secret = 'example-webhook-secret-for-tests';
const event = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_example',
        order_id: 'order_example',
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: { app: 'prapp' },
      },
    },
  },
};
const raw = JSON.stringify(event);
const headers = () =>
  new Headers({
    'x-razorpay-event-id': 'evt_example',
    'x-razorpay-signature': hmacSha256Hex(raw, secret),
  });
function deps(rpc = vi.fn().mockResolvedValue({ data: true, error: null })) {
  const fetchPayment = vi.fn().mockResolvedValue(event.payload.payment.entity);
  const gateway = { webhookSecret: secret, fetchPayment } as unknown as RazorpayGateway;
  return { service: { rpc } as unknown as ServiceSupabase, gateway, rpc, fetchPayment };
}

describe('durable payment webhook boundary', () => {
  it('rejects malformed signatures before reading private configuration', async () => {
    const d = deps();
    d.gateway.webhookSecrets = vi.fn().mockRejectedValue(new Error('must not run'));
    const h = headers();
    h.set('x-razorpay-signature', 'forged');
    expect((await handleRazorpayWebhook(d, raw, h)).status).toBe(400);
    expect(d.gateway.webhookSecrets).not.toHaveBeenCalled();
    expect(d.rpc).not.toHaveBeenCalled();
  });
  it('acknowledges only after durable storage and defers provider work', async () => {
    const d = deps();
    expect(await handleRazorpayWebhook(d, raw, headers())).toEqual({ status: 200, body: 'queued' });
    expect(d.rpc).toHaveBeenCalledWith(
      'svc_record_webhook',
      expect.objectContaining({ p_event_id: 'evt_example' }),
    );
    expect(d.fetchPayment).not.toHaveBeenCalled();
  });
  it('asks Razorpay to retry when the database cannot store the event', async () => {
    const d = deps(
      vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await handleRazorpayWebhook(d, raw, headers())).status).toBe(503);
    expect(d.fetchPayment).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it('ignores an authenticated duplicate without reapplying its effects', async () => {
    const d = deps(vi.fn().mockResolvedValue({ data: false, error: null }));
    expect((await handleRazorpayWebhook(d, raw, headers())).body).toBe('duplicate');
    expect(d.fetchPayment).not.toHaveBeenCalled();
  });
  it('rejects tampering before storing anything', async () => {
    const d = deps();
    expect((await handleRazorpayWebhook(d, `${raw} `, headers())).status).toBe(400);
    expect(d.rpc).not.toHaveBeenCalled();
  });
  it('accepts retained secrets when the configured webhook secret has rotated', async () => {
    const d = deps();
    d.gateway.webhookSecret = 'replacement-secret';
    d.gateway.webhookSecrets = async () => ['replacement-secret', secret];
    expect((await handleRazorpayWebhook(d, raw, headers())).status).toBe(200);
  });
  it('preserves failed work for retry with the claim token', async () => {
    const d = deps(
      vi.fn().mockImplementation((name: string) =>
        Promise.resolve({
          error: null,
          data:
            name === 'svc_claim_webhook'
              ? { event_id: 'evt_example', payload: event, lock_token: 'claim-token' }
              : null,
        }),
      ),
    );
    d.fetchPayment.mockRejectedValue(new Error('network response lost'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let iterations = 0;
    expect(await processPaymentWebhooks(d, () => iterations++ > 0)).toEqual({
      processed: 0,
      failed: 1,
    });
    expect(d.rpc).toHaveBeenCalledWith('svc_complete_webhook', {
      p_event_id: 'evt_example',
      p_lock_token: 'claim-token',
      p_error: 'provider_or_database_error',
    });
    vi.restoreAllMocks();
  });
  it('fetches current provider state before applying a stale event', async () => {
    const d = deps(
      vi.fn().mockImplementation((name: string) =>
        Promise.resolve({
          error: null,
          data:
            name === 'svc_claim_webhook'
              ? { event_id: 'evt_example', payload: event, lock_token: 'claim-token' }
              : name === 'svc_apply_payment'
                ? 'paid'
                : null,
        }),
      ),
    );
    d.fetchPayment.mockResolvedValue({
      ...event.payload.payment.entity,
      status: 'failed',
      amount: 49900,
    });
    let iterations = 0;
    await processPaymentWebhooks(d, () => iterations++ > 0);
    expect(d.rpc).toHaveBeenCalledWith(
      'svc_apply_payment',
      expect.objectContaining({ p_status: 'failed' }),
    );
  });
});
