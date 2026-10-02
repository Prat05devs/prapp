import { createRequest } from '@prapp/api-client';
import type { StaffAccountInput } from '@prapp/shared';

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
  createStaff: (body: StaffAccountInput) =>
    request<{ id: string; email: string; role: 'editor' | 'admin' }>('/api/admin/staff', {
      method: 'POST',
      body,
    }),
  /** staff_* / admin_* functions, run as the signed-in staff member (POST /api/admin/actions). */
  action: (action: AdminActionName, args: Record<string, unknown>) =>
    request<{ ok: true; data: unknown }>('/api/admin/actions', {
      method: 'POST',
      body: { action, args },
    }),
  /** Admin-managed tables (POST /api/admin/records/:table). */
  records: (
    table: AdminTable,
    op: 'insert' | 'upsert' | 'update' | 'delete',
    body: {
      match?: Record<string, unknown>;
      values?: Record<string, unknown> | Record<string, unknown>[];
    },
  ) =>
    request<{ ok: true; rows: Record<string, unknown>[] }>(`/api/admin/records/${table}`, {
      method: 'POST',
      body: { op, ...body },
    }),
  /** Upload to the public-assets bucket; returns the stored path. */
  upload: (file: Blob, folder: 'portals' | 'showcase', name: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    form.append('name', name);
    return request<{ path: string }>('/api/admin/uploads', { method: 'POST', body: form });
  },
  removeUpload: (path: string) =>
    request<{ ok: true }>('/api/admin/uploads', { method: 'DELETE', body: { path } }),
  setStaffPassword: (id: string, password: string) =>
    request<{ updated: true }>(`/api/admin/staff/${id}/password`, {
      method: 'POST',
      body: { password },
    }),
};

export type AdminActionName =
  | 'admin_set_role'
  | 'admin_set_staff_active'
  | 'admin_clear_attention'
  | 'admin_assign_order'
  | 'admin_reopen_order'
  | 'staff_claim_order'
  | 'staff_release_order'
  | 'staff_add_note'
  | 'staff_request_changes'
  | 'staff_set_placement_link'
  | 'staff_mark_placement_failed'
  | 'staff_swap_placement';

export type AdminTable =
  | 'trusted_sources'
  | 'portals'
  | 'packages'
  | 'package_portals'
  | 'app_settings'
  | 'showcase_stories';

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
