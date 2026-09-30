import { beforeAll, describe, expect, it } from 'vitest';
import { deleteAccount } from '@/server/account';
import { startCheckout } from '@/server/checkout';
import { runCleanup } from '@/server/cleanup';
import { applyRazorpayPayment } from '@/server/payments';
import { FakeRazorpay } from '@/test/fake-razorpay';
import { createUser, orderRow, readyDraft, razorpayCheckout, service } from './harness';

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
  process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  process.env.RAZORPAY_LIVEMODE = 'false';
  process.env.CHECKOUT_TOKEN_SECRET = 't'.repeat(48);
});

describe('P7: account deletion (LLD §6.5)', () => {
  it('is blocked while an order is active, and keeps the order record after', async () => {
    const gw = new FakeRazorpay();
    const user = await createUser();
    const { orderId } = await readyDraft(user);
    const { razorpayOrderId } = razorpayCheckout(
      await startCheckout(
        { user: { supabase: user.db, userId: user.id }, service, gateway: gw },
        orderId,
        'web',
      ),
    );
    await applyRazorpayPayment(service, gw, gw.pay(razorpayOrderId));

    await expect(deleteAccount(service, user.id)).rejects.toMatchObject({
      code: 'account_has_active_orders',
    });

    // finish the order (published) → deletion allowed; order kept with its snapshot
    await service.from('orders').update({ status: 'in_progress' }).eq('id', orderId);
    await service
      .from('order_placements')
      .update({ status: 'live', live_url: 'https://portal-one.example/x' })
      .eq('order_id', orderId);
    await service.from('orders').update({ status: 'published' }).eq('id', orderId);
    await deleteAccount(service, user.id);

    const order = await orderRow(orderId);
    expect(order.user_id).toBeNull();
    expect(order.customer_email).toBe(user.email);
    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    expect(profile).toBeNull();
  });

  it('is allowed with only a draft', async () => {
    const user = await createUser();
    await readyDraft(user);
    await expect(deleteAccount(service, user.id)).resolves.toBeUndefined();
  });
});

describe('P7: cleanup (LLD §14)', () => {
  it('never deletes recent drafts or drafts that reached checkout', async () => {
    const gw = new FakeRazorpay();
    const user = await createUser();
    const fresh = await readyDraft(user);
    const checkedOut = await readyDraft(user);
    await startCheckout(
      { user: { supabase: user.db, userId: user.id }, service, gateway: gw },
      checkedOut.orderId,
      'web',
    );
    await runCleanup(service, () => false);
    expect((await orderRow(fresh.orderId)).status).toBe('draft');
    expect((await orderRow(checkedOut.orderId)).status).toBe('pending_payment');
  });
});
