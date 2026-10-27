import 'server-only';
import { AppError, throwDbError } from '@/server/api';
import { applyRazorpayRefund } from '@/server/payments';
import { RAZORPAY_APP_TAG, noteValue, type RazorpayGateway } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

type Deps = { service: ServiceSupabase; gateway: RazorpayGateway };
type RefundRequest = {
  id: string;
  payment_id: string;
  order_id: string;
  actor_id: string | null;
  amount_minor: number;
  reason: string;
  razorpay_refund_id: string | null;
  completed_at: string | null;
  created_at: string;
};

/** Reserve the balance under a payment-row lock before making any external request. */
export async function refundPayment(
  deps: Deps,
  input: {
    requestId: string;
    orderId: string;
    paymentId: string;
    amountMinor: number;
    reason: string;
    adminId: string;
  },
) {
  const { data, error } = await deps.service.rpc('svc_reserve_refund', {
    p_id: input.requestId,
    p_payment_id: input.paymentId,
    p_order_id: input.orderId,
    p_actor: input.adminId,
    p_amount_minor: input.amountMinor,
    p_reason: input.reason,
  });
  if (error) throwDbError(error);
  return executeRefundRequest(deps, data);
}

export async function executeReservedRefund(deps: Deps, requestId: string) {
  const { data, error } = await deps.service
    .from('refund_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (error) throwDbError(error);
  return executeRefundRequest(deps, data);
}

async function executeRefundRequest(deps: Deps, request: RefundRequest) {
  if (request.completed_at && request.razorpay_refund_id) {
    const { data, error } = await deps.service
      .from('refunds')
      .select('status')
      .eq('razorpay_refund_id', request.razorpay_refund_id)
      .single();
    if (error) throwDbError(error);
    return { refundId: request.razorpay_refund_id, status: data.status };
  }
  const { data: payment, error } = await deps.service
    .from('payments')
    .select('razorpay_payment_id')
    .eq('id', request.payment_id)
    .single();
  if (error || !payment) throw new AppError('order_not_found');
  const gateway = deps.gateway.resolvePayment
    ? await deps.gateway.resolvePayment(payment.razorpay_payment_id)
    : deps.gateway;
  // Keep the body identical for every retry, including after process restart.
  const previous = (await gateway.fetchPaymentRefunds(payment.razorpay_payment_id)).find(
    (r) => noteValue(r.notes, 'request_id') === request.id,
  );
  // Provider idempotency retention is not an unlimited guarantee. An old unknown outcome
  // requires manual reconciliation if it cannot be found in the provider's refund records.
  if (!previous && Date.now() - new Date(request.created_at).getTime() > 24 * 3600_000) {
    const attention = await deps.service
      .from('orders')
      .update({ needs_attention: true, attention_reason: 'refund_reconciliation_required' })
      .eq('id', request.order_id);
    if (attention.error) throwDbError(attention.error);
    throw new AppError('internal_error');
  }
  const refund =
    previous ??
    (await gateway.refundPayment(payment.razorpay_payment_id, {
      requestId: request.id,
      amount: request.amount_minor,
      notes: {
        order_id: request.order_id,
        reason: request.reason.slice(0, 250),
        app: RAZORPAY_APP_TAG,
        request_id: request.id,
      },
    }));
  if (refund.payment_id !== payment.razorpay_payment_id || refund.amount !== request.amount_minor)
    throw new AppError('internal_error');
  const status = await applyRazorpayRefund(deps.service, refund, request.reason, request.actor_id);
  const completed = await deps.service.rpc('svc_complete_refund_request', {
    p_id: request.id,
    p_refund_id: refund.id,
  });
  if (completed.error) throwDbError(completed.error);
  return { refundId: refund.id, status };
}

/** Unknown timeout outcomes retain their reserved balance and retry with the same key. */
export async function retryRefundRequests(deps: Deps, timeUp: () => boolean) {
  const { data, error } = await deps.service
    .from('refund_requests')
    .select('*')
    .is('completed_at', null)
    .lt('created_at', new Date(Date.now() - 60_000).toISOString())
    .order('created_at')
    .limit(50);
  if (error) throwDbError(error);
  let completed = 0;
  let failed = 0;
  for (const request of data ?? []) {
    if (timeUp()) break;
    try {
      await executeRefundRequest(deps, request);
      completed++;
    } catch {
      failed++;
      console.error('Refund request requires reconciliation', { requestId: request.id });
    }
  }
  return { completed, failed };
}
