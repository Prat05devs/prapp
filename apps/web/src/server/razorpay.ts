import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { razorpayEnv } from '@/server/env';
import { activeIntegration, integrationCredentials } from '@/server/integrations';
import { createServiceClient } from '@/server/supabase/service';

// Thin wrapper around the Razorpay Node SDK (server only, golden rule 3).
// Route handlers depend on this interface so tests can pass a fake gateway.

export type RzpPaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: RzpPaymentStatus;
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  captured?: boolean;
  created_at?: number;
  notes?: Record<string, string | number> | unknown[];
  [key: string]: unknown;
}

export interface RzpRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  notes?: Record<string, string | number> | unknown[];
  created_at?: number;
  [key: string]: unknown;
}

export interface RzpOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
  notes?: Record<string, string | number> | unknown[];
  [key: string]: unknown;
}

export interface RazorpayGateway {
  livemode: boolean;
  credentialId?: string;
  keySecret?: string;
  webhookSecret?: string;
  webhookSecrets?: () => Promise<string[]>;
  resolveOrder?: (id: string) => Promise<RazorpayGateway>;
  resolvePayment?: (id: string) => Promise<RazorpayGateway>;
  resolveRefund?: (id: string) => Promise<RazorpayGateway>;
  keyId: string;
  createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<RzpOrder>;
  fetchOrder(orderId: string): Promise<RzpOrder>;
  fetchOrderPayments(orderId: string): Promise<RzpPayment[]>;
  fetchPayment(paymentId: string): Promise<RzpPayment>;
  capturePayment(paymentId: string, amount: number, currency: string): Promise<RzpPayment>;
  refundPayment(
    paymentId: string,
    input: { amount: number; notes: Record<string, string>; requestId: string },
  ): Promise<RzpRefund>;
  fetchRefund(refundId: string): Promise<RzpRefund>;
  fetchPaymentRefunds(paymentId: string): Promise<RzpRefund[]>;
}

export async function razorpayGateway(): Promise<RazorpayGateway> {
  const active = await activeIntegration('razorpay');
  return active ? gatewayForCredential(active.id) : legacyGateway();
}

/** Recovery must work even when new checkouts are disabled or no profile is active. */
export function razorpayRecoveryGateway(): RazorpayGateway {
  return buildGateway({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? '',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    RAZORPAY_LIVEMODE: process.env.RAZORPAY_LIVEMODE === 'true',
  });
}

function legacyGateway(): RazorpayGateway {
  return buildGateway(razorpayEnv());
}

async function gatewayForCredential(id: string): Promise<RazorpayGateway> {
  const config = await integrationCredentials(id);
  if (config.provider !== 'razorpay') throw new Error('Invalid payment credential');
  return buildGateway(
    {
      RAZORPAY_KEY_ID: config.keyId,
      RAZORPAY_KEY_SECRET: config.keySecret,
      RAZORPAY_WEBHOOK_SECRET: config.webhookSecret,
      RAZORPAY_LIVEMODE: config.environment === 'live',
    },
    id,
  );
}

async function gatewayForOrder(id: string): Promise<RazorpayGateway> {
  const { data, error } = await createServiceClient()
    .from('payment_intents')
    .select('credential_id, livemode')
    .eq('razorpay_order_id', id)
    .single();
  if (error || !data) throw new Error('Payment intent configuration not found');
  const gateway = data.credential_id
    ? await gatewayForCredential(data.credential_id)
    : legacyGateway();
  if (gateway.livemode !== data.livemode) throw new Error('Payment environment mismatch');
  return gateway;
}

function buildGateway(
  env: {
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    RAZORPAY_WEBHOOK_SECRET: string;
    RAZORPAY_LIVEMODE: boolean;
  },
  credentialId?: string,
): RazorpayGateway {
  // Bounded provider calls. Only reads are automatically retried; writes need a durable identity.
  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    requestId?: string,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...(requestId ? { 'X-Refund-Idempotency': requestId } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10_000),
      });
      if (method === 'GET' && attempt === 0 && [429, 502, 503, 504].includes(response.status)) {
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 250 + Math.floor(Math.random() * 250)));
        continue;
      }
      if (!response.ok) throw new Error(`payment_provider_status_${response.status}`);
      return (await response.json()) as T;
    }
  }
  const encode = encodeURIComponent;
  const gateway: RazorpayGateway = {
    credentialId,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    webhookSecrets: async () => {
      // Webhook secrets rotate independently of the API key. Accept retained secrets in
      // this mode; API fetches still use the payment's pinned credential before fulfilment.
      const { data, error } = await createServiceClient()
        .from('integration_credentials')
        .select('id')
        .eq('provider', 'razorpay');
      if (error) throw new Error('webhook_configuration_unavailable');
      const configs = await Promise.all((data ?? []).map((r) => integrationCredentials(r.id)));
      return [
        ...new Set([
          env.RAZORPAY_WEBHOOK_SECRET,
          ...configs.flatMap((c) => (c.provider === 'razorpay' ? [c.webhookSecret] : [])),
        ]),
      ].filter(Boolean);
    },
    resolveOrder: gatewayForOrder,
    resolvePayment: async (id) => {
      const { data, error } = await createServiceClient()
        .from('payments')
        .select('payment_intents!payments_intent_id_fkey(razorpay_order_id)')
        .eq('razorpay_payment_id', id)
        .single();
      if (error || !data?.payment_intents) throw new Error('Payment configuration not found');
      return gatewayForOrder(data.payment_intents.razorpay_order_id);
    },
    resolveRefund: async (id) => {
      const { data, error } = await createServiceClient()
        .from('refunds')
        .select('payments(razorpay_payment_id)')
        .eq('razorpay_refund_id', id)
        .single();
      if (error || !data?.payments) throw new Error('Refund configuration not found');
      return gateway.resolvePayment!(data.payments.razorpay_payment_id);
    },
    livemode: env.RAZORPAY_LIVEMODE,
    keyId: env.RAZORPAY_KEY_ID,
    createOrder: (input) => call<RzpOrder>('POST', '/orders', input),
    fetchOrder: (id) => call<RzpOrder>('GET', `/orders/${encode(id)}`),
    fetchOrderPayments: async (id) =>
      (await call<{ items: RzpPayment[] }>('GET', `/orders/${encode(id)}/payments`)).items,
    fetchPayment: (id) => call<RzpPayment>('GET', `/payments/${encode(id)}`),
    capturePayment: (id, amount, currency) =>
      call<RzpPayment>('POST', `/payments/${encode(id)}/capture`, { amount, currency }),
    refundPayment: (id, input) =>
      call<RzpRefund>(
        'POST',
        `/payments/${encode(id)}/refund`,
        { amount: input.amount, notes: input.notes },
        input.requestId,
      ),
    fetchRefund: (id) => call<RzpRefund>('GET', `/refunds/${encode(id)}`),
    fetchPaymentRefunds: async (id) => {
      const results: RzpRefund[] = [];
      const started = Date.now();
      for (let skip = 0; skip < 1000; skip += 100) {
        if (Date.now() - started > 15_000) throw new Error('refund_lookup_timeout');
        const page = await call<{ items: RzpRefund[] }>(
          'GET',
          `/payments/${encode(id)}/refunds?count=100&skip=${skip}`,
        );
        results.push(...page.items);
        if (page.items.length < 100) return results;
      }
      throw new Error('refund_lookup_requires_review');
    },
  };
  return gateway;
}

export function hmacSha256Hex(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET) (LLD §9.6). */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  return safeEqual(hmacSha256Hex(`${orderId}|${paymentId}`, secret), signature);
}

/** Webhook signature: HMAC_SHA256(raw body, WEBHOOK_SECRET) (LLD §9.7). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  return safeEqual(hmacSha256Hex(rawBody, secret), signature);
}

/** Razorpay `notes` is an object, or [] when empty. */
export function noteValue(notes: unknown, key: string): string | undefined {
  if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
    const v = (notes as Record<string, unknown>)[key];
    return v === undefined || v === null ? undefined : String(v);
  }
  return undefined;
}

export const RAZORPAY_APP_TAG = 'prapp';
