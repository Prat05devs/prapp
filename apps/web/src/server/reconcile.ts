import 'server-only';
import { applyRazorpayRefund, settleRazorpayOrder } from '@/server/payments';
import type { RazorpayGateway } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

const PAID_OR_LATER = [
  'paid',
  'in_progress',
  'changes_requested',
  'published',
  'rejected',
  'refunded',
];

/** POST /api/cron/reconcile-payments (LLD §9.8). Idempotent and time-boxed. */
export async function reconcilePayments(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  timeUp: () => boolean,
) {
  const counts = { intents: 0, paymentsApplied: 0, refunds: 0, errors: 0, timedOut: false };
  const since = new Date(Date.now() - 72 * 3600_000).toISOString();

  // 1a. Recent open intents; 1b. current intents of unpaid orders.
  const [recent, unpaid] = await Promise.all([
    deps.service
      .from('payment_intents')
      .select('razorpay_order_id, orders!payment_intents_order_id_fkey(status)')
      .in('status', ['created', 'attempted'])
      .gte('created_at', since),
    deps.service
      .from('orders')
      .select('payment_intents!orders_current_intent_fk(razorpay_order_id)')
      .in('status', ['pending_payment', 'expired'])
      .not('current_intent_id', 'is', null),
  ]);
  const ids = new Set<string>();
  for (const i of recent.data ?? []) {
    if (!PAID_OR_LATER.includes(i.orders?.status ?? '')) ids.add(i.razorpay_order_id);
  }
  for (const o of unpaid.data ?? []) {
    if (o.payment_intents?.razorpay_order_id) ids.add(o.payment_intents.razorpay_order_id);
  }

  for (const rzpOrderId of ids) {
    if (timeUp()) {
      counts.timedOut = true;
      return counts;
    }
    try {
      const { results } = await settleRazorpayOrder(deps.service, deps.gateway, rzpOrderId);
      counts.intents += 1;
      counts.paymentsApplied += results.length;
    } catch (e) {
      counts.errors += 1;
      console.error('reconcile: intent', rzpOrderId, e instanceof Error ? e.message : e);
    }
  }

  // 2. Refunds stuck in pending for 30+ minutes.
  const { data: pending } = await deps.service
    .from('refunds')
    .select('razorpay_refund_id, reason, initiated_by')
    .eq('status', 'pending')
    .lt('updated_at', new Date(Date.now() - 30 * 60_000).toISOString())
    .not('razorpay_refund_id', 'is', null);
  for (const r of pending ?? []) {
    if (timeUp()) {
      counts.timedOut = true;
      break;
    }
    try {
      const fresh = await deps.gateway.fetchRefund(r.razorpay_refund_id!);
      await applyRazorpayRefund(deps.service, fresh, r.reason, r.initiated_by);
      counts.refunds += 1;
    } catch (e) {
      counts.errors += 1;
      console.error('reconcile: refund', r.razorpay_refund_id, e instanceof Error ? e.message : e);
    }
  }
  return counts;
}
