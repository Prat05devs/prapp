import type {
  CheckoutResponse,
  FactCheckReport,
  FactCheckSubmitInput,
  FactCheckSubmitResponse,
  CheckoutReturn,
  CompleteProfileInput,
  MeResponse,
  OrderContentInput,
  OrderDetailResponse,
  OrderImageMeta,
} from '@prapp/shared';
import { createRequest, type ApiClientOptions } from './client';
import type { Catalogue, CustomerOrder, OrderImage, OrderListItem, ShowcaseStory } from './direct';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data: { deep_link?: string; order_id?: string } | null;
  read_at: string | null;
  created_at: string;
}

/** An image to upload: browsers pass a Blob, React Native a { uri, name, type } file part. */
export type UploadFile = Blob | { uri: string; name: string; type: string };

const enc = encodeURIComponent;

/** Typed wrappers for /api/* (LLD §8). Grows phase by phase. */
export function createApiClient(options: ApiClientOptions) {
  const request = createRequest(options);
  return {
    me: {
      get: (signal?: AbortSignal) => request<MeResponse>('/api/me', { signal }),
      /** Complete or edit the profile (name + phone). */
      update: (input: CompleteProfileInput) =>
        request<MeResponse>('/api/me', { method: 'PATCH', body: input }),
      delete: () => request<{ ok: true }>('/api/me', { method: 'DELETE' }),
    },
    factChecks: {
      submit: (input: FactCheckSubmitInput) =>
        request<FactCheckSubmitResponse>('/api/fact-checks', { method: 'POST', body: input }),
      /** Guests prove ownership with their device id (LLD §8.4). */
      get: (id: string, deviceId?: string, signal?: AbortSignal) =>
        request<FactCheckReport>(
          `/api/fact-checks/${encodeURIComponent(id)}${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`,
          { signal },
        ),
      setPublic: (id: string, isPublic: boolean, deviceId?: string) =>
        request<{ ok: true }>(`/api/fact-checks/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: { isPublic, deviceId },
        }),
    },
    catalogue: {
      get: (signal?: AbortSignal) =>
        request<Catalogue & { settings: Record<string, unknown>; showcase: ShowcaseStory[] }>(
          '/api/catalogue',
          { signal },
        ),
    },
    notifications: {
      list: () => request<NotificationItem[]>('/api/notifications'),
      markRead: (ids: string[]) =>
        request<{ ok: true }>('/api/notifications/read', { method: 'POST', body: { ids } }),
    },
    devices: {
      register: (token: string, platform: 'ios' | 'android') =>
        request<{ ok: true }>('/api/devices', { method: 'POST', body: { token, platform } }),
      unregister: (token: string) =>
        request<{ ok: true }>('/api/devices', { method: 'DELETE', body: { token } }),
    },
    orders: {
      list: () => request<OrderListItem[]>('/api/orders'),
      /** Create a draft (LLD §9.3 step 1). */
      create: (content: OrderContentInput) =>
        request<{ id: string; orderNumber: string }>('/api/orders', {
          method: 'POST',
          body: content,
        }),
      /** Editor data: content, images and 1-hour thumbnail URLs keyed by storage path. */
      edit: (id: string, signal?: AbortSignal) =>
        request<{ order: CustomerOrder; imageUrls: Record<string, string> }>(
          `/api/orders/${enc(id)}/edit`,
          { signal },
        ),
      update: (id: string, content: OrderContentInput) =>
        request<{ ok: true }>(`/api/orders/${enc(id)}`, { method: 'PATCH', body: content }),
      /** Delete a draft, or cancel an order whose checkout started. */
      discard: (id: string) =>
        request<{ ok: true }>(`/api/orders/${enc(id)}`, { method: 'DELETE' }),
      resubmit: (id: string, content: OrderContentInput) =>
        request<{ ok: true }>(`/api/orders/${enc(id)}/resubmit`, {
          method: 'POST',
          body: content,
        }),
      uploadImage: (
        id: string,
        file: UploadFile,
        meta: Omit<OrderImageMeta, 'sizeBytes'> & { sizeBytes?: number },
        replaceImageId?: string,
      ) => {
        const form = new FormData();
        form.append('file', file as Blob);
        form.append('meta', JSON.stringify(meta));
        if (replaceImageId) form.append('replaceImageId', replaceImageId);
        return request<{ image: OrderImage; url: string | null }>(`/api/orders/${enc(id)}/images`, {
          method: 'POST',
          body: form,
        });
      },
      removeImage: (id: string, imageId: string) =>
        request<{ ok: true }>(`/api/orders/${enc(id)}/images/${enc(imageId)}`, {
          method: 'DELETE',
        }),
      get: (id: string, signal?: AbortSignal) =>
        request<OrderDetailResponse>(`/api/orders/${encodeURIComponent(id)}`, { signal }),
      /** Start or reuse a Razorpay payment (LLD §9.4). */
      checkout: (id: string, returnTo: CheckoutReturn) =>
        request<CheckoutResponse>(`/api/orders/${encodeURIComponent(id)}/checkout`, {
          method: 'POST',
          body: { returnTo },
        }),
      /** Back to draft to edit an unpaid order (LLD §9.4). */
      reopen: (id: string) =>
        request<{ ok: true }>(`/api/orders/${encodeURIComponent(id)}/reopen`, { method: 'POST' }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
