import { createRequest } from '@prapp/api-client';

const request = createRequest({ baseUrl: '' });

/** Admin/staff API routes (LLD §8.3). Cookies authenticate. */
export const adminApi = {
  publish: (id: string, allowPartial = false) =>
    request<{ published: true; report: 'ready' | 'failed' }>(`/api/admin/orders/${id}/publish`, {
      method: 'POST',
      body: { allowPartial },
    }),
  regenerateReport: (id: string) =>
    request<{ report: 'ready' }>(`/api/admin/orders/${id}/regenerate-report`, { method: 'POST' }),
  reject: (id: string, reason: string) =>
    request<{ rejected: true }>(`/api/admin/orders/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  refund: (id: string, body: { paymentId: string; amountMinor: number; reason: string }) =>
    request<{ refund: { refundId: string; status: string } }>(`/api/admin/orders/${id}/refund`, {
      method: 'POST',
      body,
    }),
  payment: (id: string) => request<RazorpayPanel>(`/api/admin/orders/${id}/payment`),
};

export interface RazorpayPanel {
  intents: {
    intent: {
      id: string;
      razorpay_order_id: string;
      amount_minor: number;
      currency: string;
      status: string;
      livemode: boolean;
      created_at: string;
    };
    error?: string;
    razorpayOrder?: { id: string; status: string; amount: number };
    payments?: {
      id: string;
      method: string | null;
      status: string;
      amount: number;
      createdAt: string | null;
      dbStatus: string | null;
      mismatch: boolean;
      refunds: {
        id: string;
        status: string;
        amount: number;
        dbStatus: string | null;
        mismatch: boolean;
      }[];
    }[];
  }[];
}
