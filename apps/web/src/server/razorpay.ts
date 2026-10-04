import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { razorpayEnv } from '@/server/env';

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
    input: { amount: number; notes: Record<string, string> },
  ): Promise<RzpRefund>;
  fetchRefund(refundId: string): Promise<RzpRefund>;
  fetchPaymentRefunds(paymentId: string): Promise<RzpRefund[]>;
}

let gateway: RazorpayGateway | undefined;

export function razorpayGateway(): RazorpayGateway {
  if (gateway) return gateway;
  const env = razorpayEnv();
  const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  gateway = {
    livemode: env.RAZORPAY_LIVEMODE,
    keyId: env.RAZORPAY_KEY_ID,
    createOrder: async (input) => (await rzp.orders.create(input)) as unknown as RzpOrder,
    fetchOrder: async (id) => (await rzp.orders.fetch(id)) as unknown as RzpOrder,
    fetchOrderPayments: async (id) =>
      ((await rzp.orders.fetchPayments(id)).items ?? []) as unknown as RzpPayment[],
    fetchPayment: async (id) => (await rzp.payments.fetch(id)) as unknown as RzpPayment,
    capturePayment: async (id, amount, currency) =>
      (await rzp.payments.capture(id, amount, currency)) as unknown as RzpPayment,
    refundPayment: async (id, input) =>
      (await rzp.payments.refund(id, input)) as unknown as RzpRefund,
    fetchRefund: async (id) => (await rzp.refunds.fetch(id)) as unknown as RzpRefund,
    fetchPaymentRefunds: async (id) =>
      ((await rzp.payments.fetchMultipleRefund(id)).items ?? []) as unknown as RzpRefund[],
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
