import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '@/server/api';
import { handlePaymentCallback } from '@/server/callback';
import { reopenOrder, startCheckout } from '@/server/checkout';
import { verifyCheckoutToken } from '@/server/checkout-token';
import { reconcilePayments } from '@/server/reconcile';
import { handleRazorpayWebhook } from '@/server/webhook';
import { FakeRazorpay, checkoutSignature, webhookSignature } from '@/test/fake-razorpay';
import {
  checkoutFields,
  createUser,
  orderRow,
  paymentsOf,
  placementsOf,
  razorpayCheckout,
  readyDraft,
  service,
  type TestUser,
} from './harness';

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';
const TOKEN_SECRET = 't'.repeat(48);

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.RAZORPAY_LIVEMODE = 'false';
  process.env.CHECKOUT_TOKEN_SECRET = TOKEN_SECRET;
});

let gw: FakeRazorpay;
let user: TestUser;
let orderId: string;

beforeEach(async () => {
  gw = new FakeRazorpay();
  user = await createUser();
  ({ orderId } = await readyDraft(user));
});

const deps = () => ({ user: { supabase: user.db, userId: user.id }, service, gateway: gw });

async function checkout(returnTo: 'web' | 'app' = 'web') {
  return razorpayCheckout(await startCheckout(deps(), orderId, returnTo));
}

function successForm(rzpOrderId: string, paymentId: string, signature?: string) {
  const f = new FormData();
  f.set('razorpay_order_id', rzpOrderId);
  f.set('razorpay_payment_id', paymentId);
  f.set('razorpay_signature', signature ?? checkoutSignature(rzpOrderId, paymentId, KEY_SECRET));
  return f;
}

let eventSeq = 0;
async function webhook(
  event: string,
  payload: Record<string, unknown>,
  eventId = `evt_${++eventSeq}_${Date.now()}`,
) {
  const raw = JSON.stringify({ event, payload });
  const headers = new Headers({
    'x-razorpay-signature': webhookSignature(raw, WEBHOOK_SECRET),
    'x-razorpay-event-id': eventId,
  });
  return handleRazorpayWebhook({ service, gateway: gw }, raw, headers);
}

describe('checkout (LLD §9.4)', () => {
  it('creates an intent at the DB price and a signed 30-minute link', async () => {
    const res = await checkout();
    expect(res.amountMinor).toBe(49900);
    expect(res.currency).toBe('INR');
    const order = await orderRow(orderId);
    expect(order.status).toBe('pending_payment');
    expect(order.customer_phone).toBe('+919876543210');
    const token = verifyCheckoutToken(checkoutFields(res.checkoutUrl), TOKEN_SECRET);
    expect(token).toMatchObject({ ok: true, payload: { orderId, r: 'web' } });
    const rzp = gw.orders.get(res.razorpayOrderId)!;
    expect(rzp.notes).toMatchObject({ order_id: orderId, app: 'prapp' });
  });

  it('row 1: a double tap reuses the same intent', async () => {
    const a = await checkout();
    const b = await checkout();
    expect(b.razorpayOrderId).toBe(a.razorpayOrderId);
    expect(gw.calls.filter((c) => c === 'createOrder')).toHaveLength(1);
  });

  it('rejects incomplete orders', async () => {
    await user.db.from('orders').update({ declaration_accepted_at: null }).eq('id', orderId);
    await expect(checkout()).rejects.toMatchObject({ code: 'declaration_required' });
  });

  it('rejects when the image row exists but the file is missing from Storage', async () => {
    const { data: imgs } = await service
      .from('order_images')
      .select('storage_path')
      .eq('order_id', orderId);
    await service.storage.from('order-images').remove(imgs!.map((i) => i.storage_path));
    await expect(checkout()).rejects.toMatchObject({ code: 'image_required' });
  });

  it("does not let another user check out someone else's order", async () => {
    const other = await createUser();
    await expect(
      startCheckout(
        { user: { supabase: other.db, userId: other.id }, service, gateway: gw },
        orderId,
        'web',
      ),
    ).rejects.toMatchObject({ code: 'order_not_found' });
  });

  it('rejects an incomplete profile', async () => {
    await service.from('profiles').update({ phone: null }).eq('id', user.id);
    await expect(checkout()).rejects.toBeInstanceOf(AppError);
  });
});

describe('free checkout (PAYMENTS_MODE=free, testing phase)', () => {
  const free = () => startCheckout({ ...deps(), gateway: undefined, mode: 'free' }, orderId, 'web');

  it('confirms the order at ₹0 without Razorpay and runs the paid side effects', async () => {
    expect(await free()).toEqual({ confirmed: true, amountMinor: 0, currency: 'INR' });
    expect(gw.calls).toHaveLength(0);
    const order = await orderRow(orderId);
    expect(order).toMatchObject({ status: 'paid', amount_minor: 0, currency: 'INR' });
    expect(order.paid_payment_id).toBeNull();
    expect(order.customer_phone).toBe('+919876543210');
    expect(new Date(order.deadline_at!).getTime()).toBeGreaterThan(Date.now());
    expect(await paymentsOf(orderId)).toHaveLength(0);
    expect((await placementsOf(orderId)).length).toBeGreaterThan(0);
    const { data: notes } = await service
      .from('notifications')
      .select('type, title')
      .eq('user_id', user.id);
    expect(notes).toContainEqual({ type: 'order_paid', title: 'Order confirmed' });
  });

  it('runs the same checks as a paid checkout', async () => {
    await user.db.from('orders').update({ declaration_accepted_at: null }).eq('id', orderId);
    await expect(free()).rejects.toMatchObject({ code: 'declaration_required' });
    expect((await orderRow(orderId)).status).toBe('draft');
  });

  it('refuses a second confirmation', async () => {
    await free();
    await expect(free()).rejects.toMatchObject({ code: 'payment_already_made' });
  });
});

describe('callback (LLD §9.6)', () => {
  it('marks paid after verifying the signature and fetching the payment', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    const target = await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      successForm(razorpayOrderId, p.id),
    );
    expect(target).toContain(`/orders/${orderId}?payment=success`);
    const order = await orderRow(orderId);
    expect(order.status).toBe('paid');
    expect(order.deadline_at).not.toBeNull();
    const placements = await placementsOf(orderId);
    expect(placements.map((x) => x.channel).sort()).toEqual(['instagram', 'portal', 'portal']);
  });

  it('redirects the app to prapp://payment-result', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout('app');
    const p = gw.pay(razorpayOrderId);
    const target = await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      successForm(razorpayOrderId, p.id),
    );
    expect(target).toBe(`prapp://payment-result?status=success&order=${orderId}`);
  });

  it('row 10: captures an authorized payment', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId, 'authorized');
    await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      successForm(razorpayOrderId, p.id),
    );
    expect(gw.payments.get(p.id)!.status).toBe('captured');
    expect((await orderRow(orderId)).status).toBe('paid');
  });

  it('ignores a forged signature (order stays unpaid)', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    const target = await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      successForm(razorpayOrderId, p.id, 'f'.repeat(64)),
    );
    expect(target).toContain('payment=pending');
    expect((await orderRow(orderId)).status).toBe('pending_payment');
  });

  it('row 6: a failed payment keeps the order payable on the same intent', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId, 'failed');
    const f = new FormData();
    f.set('error[code]', 'BAD_REQUEST_ERROR');
    f.set('error[description]', 'Payment failed');
    f.set('error[metadata]', JSON.stringify({ payment_id: p.id, order_id: razorpayOrderId }));
    const target = await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      f,
    );
    expect(target).toContain('payment=failed');
    expect((await orderRow(orderId)).status).toBe('pending_payment');
    expect((await paymentsOf(orderId))[0]!.status).toBe('failed');
    const again = await checkout();
    expect(again.razorpayOrderId).toBe(razorpayOrderId);
  });
});

describe('webhooks (LLD §9.7)', () => {
  it('rows 3–4: the webhook alone marks the order paid', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    const out = await webhook('payment.captured', { payment: { entity: p } });
    expect(out).toEqual({ status: 200, body: 'ok' });
    expect((await orderRow(orderId)).status).toBe('paid');
  });

  it('row 2 + 5: callback and duplicate webhooks are idempotent', async () => {
    const { checkoutUrl, razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    await handlePaymentCallback(
      { service, gateway: gw },
      checkoutFields(checkoutUrl),
      successForm(razorpayOrderId, p.id),
    );
    const first = await webhook('payment.captured', { payment: { entity: p } }, `evt_dup_${p.id}`);
    const again = await webhook('payment.captured', { payment: { entity: p } }, `evt_dup_${p.id}`);
    expect(first.body).toBe('ok');
    expect(again.body).toBe('duplicate');
    expect(await paymentsOf(orderId)).toHaveLength(1);
    expect(await placementsOf(orderId)).toHaveLength(3);
  });

  it('rejects a bad signature', async () => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: {} });
    const out = await handleRazorpayWebhook(
      { service, gateway: gw },
      raw,
      new Headers({ 'x-razorpay-signature': 'nope', 'x-razorpay-event-id': 'evt_bad' }),
    );
    expect(out.status).toBe(400);
  });

  it('row 24: ignores payments from another app on the same account', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId, 'captured', { notes: { app: 'other' } });
    await webhook('payment.captured', { payment: { entity: p } });
    expect((await orderRow(orderId)).status).toBe('pending_payment');
  });

  it('row 5: out-of-order events never move a payment backwards', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    await webhook('payment.captured', { payment: { entity: p } });
    await webhook('payment.authorized', { payment: { entity: { ...p, status: 'authorized' } } });
    expect((await paymentsOf(orderId))[0]!.status).toBe('captured');
    expect((await orderRow(orderId)).status).toBe('paid');
  });

  it('row 7: UPI fails then succeeds late, even after the order expired', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId, 'failed');
    await webhook('payment.failed', { payment: { entity: p } });
    await service.from('orders').update({ status: 'expired' }).eq('id', orderId);
    const late = gw.set(p.id, { status: 'captured', error_code: null, error_description: null });
    await webhook('payment.captured', { payment: { entity: late } });
    expect((await orderRow(orderId)).status).toBe('paid');
  });

  it('row 8: a second payment is flagged as a duplicate for an admin refund', async () => {
    const { razorpayOrderId } = await checkout();
    const p1 = gw.pay(razorpayOrderId);
    const p2 = gw.pay(razorpayOrderId);
    await webhook('payment.captured', { payment: { entity: p1 } });
    await webhook('payment.captured', { payment: { entity: p2 } });
    const order = await orderRow(orderId);
    expect(order.status).toBe('paid');
    expect(order.needs_attention).toBe(true);
    expect(order.attention_reason).toBe('duplicate_payment_refund_due');
  });

  it('row 9: a tampered amount is never marked paid', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId, 'captured', { amount: 100 });
    await webhook('payment.captured', { payment: { entity: p } });
    const order = await orderRow(orderId);
    expect(order.status).toBe('pending_payment');
    expect(order.attention_reason).toBe('amount_mismatch');
  });

  it('row 21: a dispute flags the order for the admin', async () => {
    const { razorpayOrderId } = await checkout();
    const p = gw.pay(razorpayOrderId);
    await webhook('payment.captured', { payment: { entity: p } });
    await webhook('payment.dispute.created', {
      payment: { entity: p },
      dispute: { entity: { id: 'disp_1' } },
    });
    expect((await orderRow(orderId)).attention_reason).toBe('dispute_opened');
  });
});

describe('reopen and reconcile', () => {
  it('row 12: reopen goes back to draft when nothing was paid', async () => {
    await checkout();
    await reopenOrder(deps(), orderId);
    const order = await orderRow(orderId);
    expect(order.status).toBe('draft');
    expect(order.current_intent_id).toBeNull();
  });

  it('row 12: reopen is refused when Razorpay already has the money, and applies it', async () => {
    const { razorpayOrderId } = await checkout();
    gw.pay(razorpayOrderId);
    await expect(reopenOrder(deps(), orderId)).rejects.toMatchObject({
      code: 'payment_already_made',
    });
    expect((await orderRow(orderId)).status).toBe('paid');
  });

  it('row 11: a new checkout after reopen honours the new price; the old intent is abandoned', async () => {
    const first = await checkout();
    await reopenOrder(deps(), orderId);
    const second = await checkout();
    expect(second.razorpayOrderId).not.toBe(first.razorpayOrderId);
    const { data: intents } = await service
      .from('payment_intents')
      .select('status')
      .eq('order_id', orderId);
    expect(intents!.map((i) => i.status).sort()).toEqual(['abandoned', 'created']);
  });

  it('reconciliation applies a payment whose callback and webhook never arrived', async () => {
    const { razorpayOrderId } = await checkout();
    gw.pay(razorpayOrderId, 'authorized');
    const counts = await reconcilePayments({ service, gateway: gw }, () => false);
    expect(counts.errors).toBe(0);
    expect((await orderRow(orderId)).status).toBe('paid');
  });
});
