import 'server-only';
import type { PaymentResultStatus } from '@prapp/shared';
import { verifyCheckoutToken } from '@/server/checkout-token';
import { razorpayEnv } from '@/server/env';
import { applyRazorpayPayment, type ApplyResult } from '@/server/payments';
import { paymentResultUrl } from '@/server/payment-redirect';
import { verifyPaymentSignature, type RazorpayGateway } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';
import { publicEnv } from '@/lib/env';

const RESULT_STATUS: Record<ApplyResult, PaymentResultStatus> = {
  paid: 'success',
  already_paid: 'success',
  duplicate: 'success', // the order is paid; the extra payment is refunded by an admin
  failed: 'failed',
  authorized: 'pending',
  recorded: 'pending',
  amount_mismatch: 'pending',
  unknown_intent: 'pending',
};

function parseErrorMetadata(raw: FormDataEntryValue | null): { payment_id?: string } {
  if (typeof raw !== 'string') return {};
  try {
    return JSON.parse(raw) as { payment_id?: string };
  } catch {
    return {};
  }
}

/**
 * POST /api/payments/callback?t=<token> (LLD §9.6). Returns the URL to redirect to.
 * Never trusts the posted data alone: the payment is fetched from Razorpay.
 * Any failure here is safe: webhooks and reconciliation will apply the payment later.
 */
export async function handlePaymentCallback(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  token: string,
  form: FormData,
): Promise<string> {
  const env = razorpayEnv();
  const check = verifyCheckoutToken(token, env.CHECKOUT_TOKEN_SECRET);
  // An expired token is fine here: the payment may finish after 30 minutes (slow UPI).
  if (!check.ok && check.reason === 'invalid') return `${publicEnv().NEXT_PUBLIC_SITE_URL}/orders`;
  const { orderId, intentId, r } = check.payload!;

  const { data: intent } = await deps.service
    .from('payment_intents')
    .select('razorpay_order_id, order_id')
    .eq('id', intentId)
    .maybeSingle();
  if (!intent || intent.order_id !== orderId) return paymentResultUrl(r, orderId, 'pending');

  const paymentId = form.get('razorpay_payment_id');
  if (typeof paymentId !== 'string' || !paymentId) {
    // Failure: error[code], error[description], error[metadata]={"payment_id","order_id"}
    const description = form.get('error[description]');
    const meta = parseErrorMetadata(form.get('error[metadata]'));
    if (meta.payment_id) {
      try {
        const p = await deps.gateway.fetchPayment(meta.payment_id);
        if (p.order_id === intent.razorpay_order_id)
          await applyRazorpayPayment(deps.service, deps.gateway, p);
      } catch (e) {
        console.error(
          'callback: could not record failed payment',
          e instanceof Error ? e.message : e,
        );
      }
    }
    return paymentResultUrl(
      r,
      orderId,
      'failed',
      typeof description === 'string' ? description : null,
    );
  }

  const signature = form.get('razorpay_signature');
  if (
    typeof signature !== 'string' ||
    !verifyPaymentSignature(intent.razorpay_order_id, paymentId, signature, env.RAZORPAY_KEY_SECRET)
  ) {
    console.warn('callback: bad signature', { orderId, paymentId });
    return paymentResultUrl(r, orderId, 'pending');
  }

  try {
    const payment = await deps.gateway.fetchPayment(paymentId);
    if (payment.order_id !== intent.razorpay_order_id)
      return paymentResultUrl(r, orderId, 'pending');
    const result = await applyRazorpayPayment(deps.service, deps.gateway, payment);
    return paymentResultUrl(
      r,
      orderId,
      RESULT_STATUS[result],
      result === 'failed' ? (payment.error_description ?? null) : null,
    );
  } catch (e) {
    console.error('callback: apply failed', e instanceof Error ? e.message : e);
    return paymentResultUrl(r, orderId, 'pending');
  }
}
