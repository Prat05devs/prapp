import type {
  CheckoutResponse,
  FactCheckHistoryItem,
  FactCheckReport,
  FactCheckSubmitInput,
  FactCheckSubmitResponse,
  CheckoutReturn,
  MeResponse,
  OrderDetailResponse,
} from '@prapp/shared';
import { createRequest, type ApiClientOptions } from './client';

/** Typed wrappers for /api/* (LLD §8). Grows phase by phase. */
export function createApiClient(options: ApiClientOptions) {
  const request = createRequest(options);
  return {
    me: {
      get: (signal?: AbortSignal) => request<MeResponse>('/api/me', { signal }),
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
      history: () => request<FactCheckHistoryItem[]>('/api/me/fact-checks'),
    },
    orders: {
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
