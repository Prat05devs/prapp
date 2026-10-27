import 'server-only';
import type { Json } from '@prapp/db-types';
import { razorpayEnv } from '@/server/env';
import { notifyAdmins } from '@/server/notify';
import {
  applyRazorpayPayment,
  applyRazorpayRefund,
  orderIdForRazorpayOrder,
} from '@/server/payments';
import {
  RAZORPAY_APP_TAG,
  noteValue,
  verifyWebhookSignature,
  type RazorpayGateway,
  type RzpOrder,
  type RzpPayment,
  type RzpRefund,
} from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

interface WebhookEvent {
  event: string;
  payload: {
    payment?: { entity: RzpPayment };
    order?: { entity: RzpOrder };
    refund?: { entity: RzpRefund };
    dispute?: { entity: { id: string; amount?: number; reason_code?: string } };
  };
}

export type WebhookOutcome = { status: 200 | 400 | 503; body: string };

/** POST /api/webhooks/razorpay (LLD §9.7). */
export async function handleRazorpayWebhook(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  raw: string,
  headers: Headers,
): Promise<WebhookOutcome> {
  const signature = headers.get('x-razorpay-signature') ?? '';
  if (!/^[0-9a-f]{64}$/.test(signature)) return { status: 400, body: 'invalid signature' };
  const eventId = headers.get('x-razorpay-event-id');
  if (!eventId || eventId.length > 200) return { status: 400, body: 'invalid event id' };
  let evt: WebhookEvent;
  try {
    evt = JSON.parse(raw) as WebhookEvent;
  } catch {
    return { status: 400, body: 'invalid json' };
  }
  if (!evt || typeof evt.event !== 'string' || !evt.payload || typeof evt.payload !== 'object') {
    return { status: 400, body: 'invalid event' };
  }
  const gateway = deps.gateway;
  const secrets = gateway.webhookSecrets
    ? await gateway.webhookSecrets()
    : [gateway.webhookSecret ?? razorpayEnv().RAZORPAY_WEBHOOK_SECRET];
  if (!secrets.some((secret) => verifyWebhookSignature(raw, signature, secret))) {
    return { status: 400, body: 'invalid signature' };
  }

  const { data: first, error } = await deps.service.rpc('svc_record_webhook', {
    p_event_id: eventId,
    p_event_type: evt.event,
    p_payload: evt as unknown as Json,
  });
  if (error) {
    // Could not even record it: let Razorpay retry.
    console.error('webhook: record failed', error.message);
    return { status: 503, body: 'retry' };
  }
  if (!first) return { status: 200, body: 'duplicate' };

  return { status: 200, body: 'queued' };
}

/** A durable DB claim survives process restarts; expired claims are reclaimed after 2 min. */
export async function processPaymentWebhooks(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  timeUp: () => boolean,
) {
  let processed = 0;
  let failed = 0;
  while (!timeUp()) {
    const { data: job, error } = await deps.service.rpc('svc_claim_webhook');
    if (error) throw new Error('webhook_queue_unavailable');
    if (!job?.event_id || !job.lock_token) break;
    let failure: string | undefined;
    try {
      await dispatch(deps, job.payload as unknown as WebhookEvent);
      processed++;
    } catch {
      failure = 'provider_or_database_error';
      failed++;
      console.error('webhook processing failed', { eventId: job.event_id });
    }
    const done = await deps.service.rpc('svc_complete_webhook', {
      p_event_id: job.event_id,
      p_lock_token: job.lock_token,
      p_error: failure,
    });
    if (done.error) throw new Error('webhook_completion_unavailable');
  }
  return { processed, failed };
}

function isOurs(evt: WebhookEvent): boolean {
  const tags = [
    noteValue(evt.payload.payment?.entity.notes, 'app'),
    noteValue(evt.payload.order?.entity.notes, 'app'),
  ];
  return tags.includes(RAZORPAY_APP_TAG);
}

async function dispatch(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  evt: WebhookEvent,
) {
  const type = evt.event;

  if (type.startsWith('refund.')) {
    // DECISION: refunds made in the Razorpay dashboard carry no notes, so they are matched by
    // payment id instead (svc_apply_refund ignores payments that are not ours).
    const r = evt.payload.refund?.entity;
    if (!r) return;
    const gateway = deps.gateway.resolvePayment
      ? await deps.gateway.resolvePayment(r.payment_id)
      : deps.gateway;
    const fresh = await gateway.fetchRefund(r.id);
    if (fresh.payment_id !== r.payment_id) throw new Error('refund_payment_mismatch');
    await applyRazorpayRefund(deps.service, fresh, noteValue(fresh.notes, 'reason') ?? 'refund');
    return;
  }

  if (!isOurs(evt)) return; // another app on the same Razorpay account (§9.10 row 24)

  if (type === 'payment.dispute.created') {
    const p = evt.payload.payment?.entity;
    const orderId = p ? await orderIdForRazorpayOrder(deps.service, p.order_id) : undefined;
    if (!orderId) return;
    await deps.service
      .from('orders')
      .update({ needs_attention: true, attention_reason: 'dispute_opened' })
      .eq('id', orderId);
    await notifyAdmins(deps.service, {
      type: 'admin_dispute',
      title: 'Payment dispute opened',
      body: `A chargeback/dispute was opened for payment ${p?.id}. Respond in the Razorpay dashboard.`,
      orderId,
    });
    return;
  }

  if (type.startsWith('payment.') || type === 'order.paid') {
    const p = evt.payload.payment?.entity;
    if (!p) return;
    const gateway = deps.gateway.resolveOrder
      ? await deps.gateway.resolveOrder(p.order_id)
      : deps.gateway;
    const fresh = await gateway.fetchPayment(p.id);
    if (fresh.order_id !== p.order_id) throw new Error('payment_order_mismatch');
    await applyRazorpayPayment(deps.service, gateway, fresh);
  }
}
