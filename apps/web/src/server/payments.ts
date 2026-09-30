import 'server-only';
import type { Json } from '@prapp/db-types';
import { throwDbError } from '@/server/api';
import { notifyAdmins } from '@/server/notify';
import type { RazorpayGateway, RzpPayment, RzpRefund } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

/** Values returned by svc_apply_payment. */
export type ApplyResult =
  | 'paid'
  | 'already_paid'
  | 'duplicate'
  | 'amount_mismatch'
  | 'failed'
  | 'authorized'
  | 'unknown_intent'
  | 'recorded';

/**
 * The only way an order becomes paid (golden rule 2): capture if still authorized,
 * then hand the payment as fetched from Razorpay to svc_apply_payment (idempotent).
 */
export async function applyRazorpayPayment(
  service: ServiceSupabase,
  gw: RazorpayGateway,
  fetched: RzpPayment,
): Promise<ApplyResult> {
  let p = fetched;
  if (p.status === 'authorized') {
    try {
      p = await gw.capturePayment(p.id, p.amount, p.currency);
    } catch {
      // Already captured by auto-capture or a parallel request: read the current state.
      p = await gw.fetchPayment(p.id);
    }
  }

  const { data, error } = await service.rpc('svc_apply_payment', {
    p_razorpay_order_id: p.order_id,
    p_razorpay_payment_id: p.id,
    p_status: p.status,
    p_amount_minor: p.amount,
    p_currency: p.currency.toUpperCase(),
    p_method: p.method ?? undefined,
    p_error_code: p.error_code ?? undefined,
    p_error_description: p.error_description ?? undefined,
    p_raw: p as unknown as Json,
  });
  if (error) throwDbError(error);
  const result = data as ApplyResult;

  if (result === 'duplicate' || result === 'amount_mismatch') {
    const orderId = await orderIdForRazorpayOrder(service, p.order_id);
    await notifyAdmins(service, {
      type: result === 'duplicate' ? 'admin_duplicate_payment' : 'admin_amount_mismatch',
      title: result === 'duplicate' ? 'Duplicate payment: refund due' : 'Payment amount mismatch',
      body: `Razorpay payment ${p.id} (${p.amount} ${p.currency}) needs attention.`,
      orderId,
    });
  }
  console.info('payment applied', { payment: p.id, order: p.order_id, status: p.status, result });
  return result;
}

/** Applies every payment Razorpay has for one of our Razorpay orders. */
export async function settleRazorpayOrder(
  service: ServiceSupabase,
  gw: RazorpayGateway,
  razorpayOrderId: string,
): Promise<{ results: ApplyResult[]; moneyReceived: boolean }> {
  const payments = await gw.fetchOrderPayments(razorpayOrderId);
  const results: ApplyResult[] = [];
  let moneyReceived = false;
  for (const p of payments) {
    if (p.status === 'authorized' || p.status === 'captured' || p.status === 'refunded') {
      moneyReceived = true;
    }
    results.push(await applyRazorpayPayment(service, gw, p));
  }
  return { results, moneyReceived };
}

export async function orderIdForRazorpayOrder(
  service: ServiceSupabase,
  razorpayOrderId: string,
): Promise<string | undefined> {
  const { data } = await service
    .from('payment_intents')
    .select('order_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();
  return data?.order_id;
}

/** Records a Razorpay refund (created by us, or from refund.* webhooks / reconciliation). */
export async function applyRazorpayRefund(
  service: ServiceSupabase,
  r: RzpRefund,
  reason: string,
  initiatedBy: string | null = null,
): Promise<string> {
  const { data, error } = await service.rpc('svc_apply_refund', {
    p_razorpay_payment_id: r.payment_id,
    p_razorpay_refund_id: r.id,
    p_amount_minor: r.amount,
    p_status: r.status,
    p_reason: reason,
    p_initiated_by: initiatedBy ?? undefined,
    p_raw: r as unknown as Json,
  });
  if (error) throwDbError(error);
  return data;
}
