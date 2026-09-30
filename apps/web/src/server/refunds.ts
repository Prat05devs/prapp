import 'server-only';
import { AppError, throwDbError } from '@/server/api';
import { applyRazorpayRefund } from '@/server/payments';
import type { RazorpayGateway } from '@/server/razorpay';
import { RAZORPAY_APP_TAG } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

/**
 * Refunds (part of) one of our payments through Razorpay and records it as pending;
 * the refund.processed webhook (or reconciliation) completes it (LLD §9.9).
 */
export async function refundPayment(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  input: {
    orderId: string;
    paymentId: string;
    amountMinor: number;
    reason: string;
    adminId: string;
  },
) {
  const { data: payment, error } = await deps.service
    .from('payments')
    .select('id, order_id, razorpay_payment_id, amount_minor, amount_refunded_minor, status')
    .eq('id', input.paymentId)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!payment || payment.order_id !== input.orderId) throw new AppError('order_not_found');
  if (!['captured', 'partially_refunded'].includes(payment.status))
    throw new AppError('order_not_rejectable');

  const { data: pending } = await deps.service
    .from('refunds')
    .select('amount_minor')
    .eq('payment_id', payment.id)
    .eq('status', 'pending');
  const inFlight = (pending ?? []).reduce((sum, r) => sum + r.amount_minor, 0);
  const refundable = payment.amount_minor - payment.amount_refunded_minor - inFlight;
  if (input.amountMinor <= 0 || input.amountMinor > refundable) {
    throw new AppError('validation_failed', {
      formErrors: [`Refundable amount is ${refundable} paise`],
    });
  }

  const refund = await deps.gateway.refundPayment(payment.razorpay_payment_id, {
    amount: input.amountMinor,
    notes: { order_id: input.orderId, reason: input.reason.slice(0, 250), app: RAZORPAY_APP_TAG },
  });
  const status = await applyRazorpayRefund(deps.service, refund, input.reason, input.adminId);
  return { refundId: refund.id, status };
}
