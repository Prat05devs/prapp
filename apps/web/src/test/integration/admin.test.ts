import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startCheckout } from '@/server/checkout';
import { applyRazorpayPayment } from '@/server/payments';
import { refundPayment } from '@/server/refunds';
import { generatePrReport } from '@/server/report';
import { handleRazorpayWebhook } from '@/server/webhook';
import { FakeRazorpay, webhookSignature } from '@/test/fake-razorpay';
import {
  createUser,
  orderRow,
  placementsOf,
  readyDraft,
  razorpayCheckout,
  service,
  type TestUser,
} from './harness';

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
  process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  process.env.RAZORPAY_LIVEMODE = 'false';
  process.env.CHECKOUT_TOKEN_SECRET = 't'.repeat(48);
});

let gw: FakeRazorpay;
let customer: TestUser;
let editor1: TestUser;
let editor2: TestUser;
let admin: TestUser;
let orderId: string;

async function paidOrder() {
  const { orderId: id } = await readyDraft(customer);
  const { razorpayOrderId } = razorpayCheckout(
    await startCheckout(
      { user: { supabase: customer.db, userId: customer.id }, service, gateway: gw },
      id,
      'web',
    ),
  );
  const p = gw.pay(razorpayOrderId);
  expect(await applyRazorpayPayment(service, gw, p)).toBe('paid');
  return id;
}

async function portalId(name: string) {
  const { data } = await service.from('portals').select('id').eq('name', name).single();
  return data!.id;
}

beforeEach(async () => {
  gw = new FakeRazorpay();
  [customer, editor1, editor2, admin] = await Promise.all([
    createUser(),
    createUser({ role: 'editor', name: 'Editor One' }),
    createUser({ role: 'editor', name: 'Editor Two' }),
    createUser({ role: 'admin', name: 'Admin' }),
  ]);
  orderId = await paidOrder();
});

describe('P4: claim lock and publishing', () => {
  it('two editors cannot work the same order', async () => {
    expect((await editor1.db.rpc('staff_claim_order', { p_order_id: orderId })).error).toBeNull();
    const second = await editor2.db.rpc('staff_claim_order', { p_order_id: orderId });
    expect(second.error?.message).toBe('order_not_claimable');
    const [placement] = await placementsOf(orderId);
    const link = await editor2.db.rpc('staff_set_placement_link', {
      p_placement_id: placement!.id,
      p_url: 'https://portal-one.example/story',
    });
    expect(link.error?.message).toBe('order_assigned_to_someone_else');
  });

  it('publish is blocked until every placement is live, then produces the PDF and notifies', async () => {
    await editor1.db.rpc('staff_claim_order', { p_order_id: orderId });
    const placements = await placementsOf(orderId);
    const blocked = await editor1.db.rpc('staff_mark_published', { p_order_id: orderId });
    expect(blocked.error?.message).toBe('placements_pending');

    // Portal Two is down → mark failed → replace with Portal Three
    const portalTwo = await portalId('Portal Two');
    const down = placements.find((p) => p.portal_id === portalTwo)!;
    await editor1.db.rpc('staff_mark_placement_failed', {
      p_placement_id: down.id,
      p_note: 'site down',
    });
    expect(
      (await editor1.db.rpc('staff_mark_published', { p_order_id: orderId })).error,
    ).not.toBeNull();
    const swap = await editor1.db.rpc('staff_swap_placement', {
      p_placement_id: down.id,
      p_new_portal_id: await portalId('Portal Three'),
      p_reason: 'portal two down',
    });
    expect(swap.error).toBeNull();

    const open = (await placementsOf(orderId)).filter((p) => p.status === 'pending');
    for (const p of open) {
      const url =
        p.channel === 'instagram'
          ? 'https://www.instagram.com/p/abc123/'
          : `https://${p.portal_id === (await portalId('Portal One')) ? 'portal-one' : 'portal-three'}.example/story`;
      const r = await editor1.db.rpc('staff_set_placement_link', {
        p_placement_id: p.id,
        p_url: url,
      });
      expect(r.error).toBeNull();
      expect(r.data).toBe(false); // domain matches
    }
    const mismatch = await editor1.db.rpc('staff_set_placement_link', {
      p_placement_id: open.find((p) => p.channel === 'instagram')!.id,
      p_url: 'https://example.org/wrong',
    });
    expect(mismatch.data).toBe(true); // UI shows the domain warning
    await editor1.db.rpc('staff_set_placement_link', {
      p_placement_id: open.find((p) => p.channel === 'instagram')!.id,
      p_url: 'https://www.instagram.com/p/abc123/',
    });

    expect(
      (await editor1.db.rpc('staff_mark_published', { p_order_id: orderId })).error,
    ).toBeNull();
    const report = await generatePrReport(service, orderId);
    expect(report.ok).toBe(true);
    const order = await orderRow(orderId);
    expect(order.status).toBe('published');
    expect(order.report_status).toBe('ready');
    expect(order.report_version).toBe(1);

    const pdf = await customer.db.storage.from('reports').download(order.report_path!);
    expect(pdf.error).toBeNull();
    const text = Buffer.from(await pdf.data!.arrayBuffer()).toString('latin1');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('https://portal-three.example/story');

    const { data: notes } = await customer.db
      .from('notifications')
      .select('type')
      .eq('type', 'order_published');
    expect(notes).toHaveLength(1);

    // customer now sees the live links (RLS)
    const { data: visible } = await customer.db
      .from('order_placements')
      .select('live_url')
      .eq('order_id', orderId);
    expect(visible!.length).toBe(3);
  });

  it('editors cannot run admin actions (DB)', async () => {
    const reject = await editor1.db.rpc('admin_reject_order', {
      p_order_id: orderId,
      p_reason: 'not allowed at all',
    });
    expect(reject.error?.message).toBe('not_authorized');
    const role = await editor1.db.rpc('admin_set_role', { p_user_id: editor1.id, p_role: 'admin' });
    expect(role.error?.message).toBe('not_authorized');
    const portal = await editor1.db
      .from('portals')
      .update({ is_active: false })
      .eq('name', 'Portal One')
      .select();
    expect(portal.data ?? []).toHaveLength(0);
    const payments = await editor1.db.from('payments').select('id').eq('order_id', orderId);
    expect(payments.data ?? []).toHaveLength(0);
  });

  it('customers cannot see placements before publish', async () => {
    const { data } = await customer.db
      .from('order_placements')
      .select('id')
      .eq('order_id', orderId);
    expect(data).toHaveLength(0);
  });
});

describe('P3/P4: reject and refund', () => {
  it('reject → full refund pending → webhook processed → refunded', async () => {
    const r = await admin.db.rpc('admin_reject_order', {
      p_order_id: orderId,
      p_reason: 'Content is not publishable',
    });
    expect(r.error).toBeNull();
    const order = await orderRow(orderId);
    const { refundId } = await refundPayment(
      { service, gateway: gw },
      {
        orderId,
        paymentId: order.paid_payment_id!,
        amountMinor: order.amount_minor!,
        reason: 'rejected',
        adminId: admin.id,
      },
    );
    expect((await orderRow(orderId)).status).toBe('rejected');

    const refund = { ...gw.refunds.get(refundId)!, status: 'processed' };
    const raw = JSON.stringify({
      event: 'refund.processed',
      payload: { refund: { entity: refund } },
    });
    const out = await handleRazorpayWebhook(
      { service, gateway: gw },
      raw,
      new Headers({
        'x-razorpay-signature': webhookSignature(raw, 'test_webhook_secret'),
        'x-razorpay-event-id': `evt_refund_${refundId}`,
      }),
    );
    expect(out.status).toBe(200);
    expect((await orderRow(orderId)).status).toBe('refunded');
  });

  it('refunds cannot exceed what is left on the payment', async () => {
    const order = await orderRow(orderId);
    await expect(
      refundPayment(
        { service, gateway: gw },
        {
          orderId,
          paymentId: order.paid_payment_id!,
          amountMinor: order.amount_minor! + 1,
          reason: 'too much',
          adminId: admin.id,
        },
      ),
    ).rejects.toMatchObject({ code: 'validation_failed' });
  });
});
