import { createHmac, randomBytes } from 'node:crypto';
import type {
  RazorpayGateway,
  RzpOrder,
  RzpPayment,
  RzpPaymentStatus,
  RzpRefund,
} from '@/server/razorpay';

/** In-memory Razorpay for tests: orders, payments, captures and refunds. */
export class FakeRazorpay implements RazorpayGateway {
  livemode = false;
  keyId = 'rzp_test_fake';
  orders = new Map<string, RzpOrder>();
  payments = new Map<string, RzpPayment>();
  refunds = new Map<string, RzpRefund>();
  calls: string[] = [];

  private id(prefix: string) {
    return `${prefix}_${randomBytes(7).toString('hex')}`;
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }) {
    this.calls.push('createOrder');
    const order: RzpOrder = { id: this.id('order'), status: 'created', ...input };
    this.orders.set(order.id, order);
    return order;
  }

  async fetchOrder(id: string) {
    const o = this.orders.get(id);
    if (!o) throw new Error(`no order ${id}`);
    return o;
  }

  async fetchOrderPayments(orderId: string) {
    this.calls.push('fetchOrderPayments');
    return [...this.payments.values()].filter((p) => p.order_id === orderId);
  }

  async fetchPayment(id: string) {
    this.calls.push('fetchPayment');
    const p = this.payments.get(id);
    if (!p) throw new Error(`no payment ${id}`);
    return { ...p };
  }

  async capturePayment(id: string, amount: number) {
    this.calls.push('capturePayment');
    const p = this.payments.get(id);
    if (!p || p.status !== 'authorized' || p.amount !== amount) throw new Error('cannot capture');
    p.status = 'captured';
    p.captured = true;
    return { ...p };
  }

  async refundPayment(paymentId: string, input: { amount: number; notes: Record<string, string> }) {
    this.calls.push('refundPayment');
    const r: RzpRefund = {
      id: this.id('rfnd'),
      payment_id: paymentId,
      status: 'pending',
      ...input,
    };
    this.refunds.set(r.id, r);
    return { ...r };
  }

  async fetchRefund(id: string) {
    const r = this.refunds.get(id);
    if (!r) throw new Error(`no refund ${id}`);
    return { ...r };
  }

  async fetchPaymentRefunds(paymentId: string) {
    return [...this.refunds.values()].filter((r) => r.payment_id === paymentId);
  }

  /** Simulates the customer paying on the checkout page. */
  pay(orderId: string, status: RzpPaymentStatus = 'captured', overrides: Partial<RzpPayment> = {}) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`no order ${orderId}`);
    const p: RzpPayment = {
      id: this.id('pay'),
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status,
      method: 'upi',
      captured: status === 'captured',
      notes: { order_id: String((order.notes as Record<string, string>).order_id), app: 'prapp' },
      error_code: status === 'failed' ? 'BAD_REQUEST_ERROR' : null,
      error_description: status === 'failed' ? 'Payment failed' : null,
      ...overrides,
    };
    this.payments.set(p.id, p);
    return p;
  }

  set(paymentId: string, patch: Partial<RzpPayment>) {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`no payment ${paymentId}`);
    Object.assign(p, patch);
    return { ...p };
  }
}

export function checkoutSignature(orderId: string, paymentId: string, secret: string) {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

export function webhookSignature(raw: string, secret: string) {
  return createHmac('sha256', secret).update(raw).digest('hex');
}
