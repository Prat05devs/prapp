import { errorMessage, isErrorCode, type ErrorCode } from '@prapp/shared';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** Site URL, e.g. EXPO_PUBLIC_API_URL. Empty string = same origin (web). */
  baseUrl: string;
  /** Mobile: returns the Supabase access token. Web: omit (cookies are sent). */
  getAccessToken?: () => Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export type ApiRequest = <T>(path: string, options?: RequestOptions) => Promise<T>;

export function createRequest(options: ApiClientOptions): ApiRequest {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  return async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await options.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        credentials: 'include',
        signal: init.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
      throw new ApiError(
        'internal_error',
        0,
        'Network error. Check your connection and try again.',
      );
    }

    const text = await res.text();
    const json: unknown = text ? safeParse(text) : undefined;

    if (!res.ok) throw toApiError(res.status, json);
    return json as T;
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, json: unknown): ApiError {
  const err =
    typeof json === 'object' && json !== null && 'error' in json
      ? (json as { error: { code?: unknown; message?: unknown; details?: unknown } }).error
      : undefined;
  const rawCode = typeof err?.code === 'string' ? err.code : '';
  const code: ErrorCode = isErrorCode(rawCode)
    ? rawCode
    : status === 401
      ? 'not_authenticated'
      : status === 403
        ? 'not_authorized'
        : 'internal_error';
  const message = typeof err?.message === 'string' ? err.message : errorMessage(code);
  return new ApiError(code, status, message, err?.details);
}
