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

export type WebhookOutcome = { status: 200 | 400; body: string };

/** POST /api/webhooks/razorpay (LLD §9.7). */
export async function handleRazorpayWebhook(
  deps: { service: ServiceSupabase; gateway: RazorpayGateway },
  raw: string,
  headers: Headers,
): Promise<WebhookOutcome> {
  const signature = headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, signature, razorpayEnv().RAZORPAY_WEBHOOK_SECRET)) {
    return { status: 400, body: 'invalid signature' };
  }
  let evt: WebhookEvent;
  try {
    evt = JSON.parse(raw) as WebhookEvent;
  } catch {
    return { status: 400, body: 'invalid json' };
  }
  const eventId = headers.get('x-razorpay-event-id');
  if (!eventId) return { status: 400, body: 'missing event id' };

  const { data: first, error } = await deps.service.rpc('svc_record_webhook', {
    p_event_id: eventId,
    p_event_type: evt.event,
    p_payload: evt as unknown as Json,
  });
  if (error) {
    // Could not even record it: let Razorpay retry.
    console.error('webhook: record failed', error.message);
    return { status: 400, body: 'retry' };
  }
  if (!first) return { status: 200, body: 'duplicate' };

  let failure: string | null = null;
  try {
    await dispatch(deps, evt);
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
    console.error('webhook: processing failed', { eventId, type: evt.event, failure });
  }
  await deps.service.rpc('svc_finish_webhook', {
    p_event_id: eventId,
    p_error: failure ?? undefined,
  });
  // Always 200 after recording: reconciliation repairs anything that failed (LLD §9.7).
  return { status: 200, body: failure ? 'recorded with error' : 'ok' };
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
    await applyRazorpayRefund(deps.service, r, noteValue(r.notes, 'reason') ?? 'refund');
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
    await applyRazorpayPayment(deps.service, deps.gateway, p);
  }
}
