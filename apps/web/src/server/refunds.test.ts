import { describe, expect, it, vi } from 'vitest';
import { refundPayment } from './refunds';
import type { ServiceSupabase } from './service-types';
import type { RazorpayGateway, RzpRefund } from './razorpay';

describe('refund recovery after an unknown provider outcome', () => {
  it('finds an accepted refund after a lost response without issuing another POST', async () => {
    const input = {
      requestId: '11111111-1111-4111-8111-111111111111',
      orderId: 'order-db',
      paymentId: 'payment-db',
      amountMinor: 500,
      reason: 'Partial delivery refund',
      adminId: 'admin-db',
    };
    const reservation = {
      id: input.requestId,
      order_id: input.orderId,
      payment_id: input.paymentId,
      amount_minor: input.amountMinor,
      reason: input.reason,
      actor_id: input.adminId,
      created_at: new Date().toISOString(),
      completed_at: null,
      razorpay_refund_id: null,
    };
    const rpc = vi.fn(async (name: string) => ({
      error: null,
      data:
        name === 'svc_reserve_refund'
          ? reservation
          : name === 'svc_apply_refund'
            ? 'pending'
            : null,
    }));
    const service = {
      rpc,
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { razorpay_payment_id: 'pay_external' }, error: null }),
          }),
        }),
      }),
    } as unknown as ServiceSupabase;
    const providerRefunds: RzpRefund[] = [];
    const post = vi.fn(
      async (
        _id: string,
        body: { requestId: string; amount: number; notes: Record<string, string> },
      ) => {
        providerRefunds.push({
          id: 'rfnd_accepted',
          payment_id: 'pay_external',
          amount: body.amount,
          status: 'pending',
          notes: body.notes,
        });
        throw new Error('Response lost after provider accepted the refund');
      },
    );
    const gateway = {
      refundPayment: post,
      fetchPaymentRefunds: async () => providerRefunds,
    } as unknown as RazorpayGateway;
    await expect(refundPayment({ service, gateway }, input)).rejects.toThrow('Response lost');
    expect(await refundPayment({ service, gateway }, input)).toEqual({
      refundId: 'rfnd_accepted',
      status: 'pending',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      'pay_external',
      expect.objectContaining({ requestId: input.requestId }),
    );
    expect(rpc).toHaveBeenCalledWith('svc_complete_refund_request', {
      p_id: input.requestId,
      p_refund_id: 'rfnd_accepted',
    });
  });
});
