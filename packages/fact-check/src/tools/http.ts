// Outbound fetch for untrusted URLs (LLD §15): http(s) only, no private/local addresses,
// 10 s timeout, 2 MB cap, redirects re-checked hop by hop.

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/**
 * DECISION: without DNS resolution in every runtime we block by hostname/IP literal
 * (localhost, private ranges, internal TLDs, IPv6 literals, non-standard ports).
 */
export function assertPublicUrl(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('blocked_protocol');
  if (u.username || u.password) throw new Error('blocked_credentials');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('blocked_port');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') || // IPv6 literal
    /^\d+$/.test(host) || // decimal IP
    isPrivateIPv4(host) ||
    !host.includes('.')
  ) {
    throw new Error('blocked_host');
  }
  return u;
}

export interface SafeResponse {
  finalUrl: string;
  status: number;
  contentType: string;
  body: Uint8Array;
}

export async function safeFetch(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SafeResponse> {
  let url = assertPublicUrl(raw).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; prapp-factcheck/1.0)',
          Accept: 'text/html,*/*;q=0.8',
        },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        url = assertPublicUrl(new URL(location, url).toString()).toString();
        continue;
      }
      const declared = Number(res.headers.get('content-length') ?? 0);
      if (declared > MAX_BYTES) throw new Error('too_large');
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) {
            await reader.cancel();
            throw new Error('too_large');
          }
          chunks.push(value);
        }
      }
      const body = new Uint8Array(size);
      let off = 0;
      for (const c of chunks) {
        body.set(c, off);
        off += c.byteLength;
      }
      return {
        finalUrl: url,
        status: res.status,
        contentType: res.headers.get('content-type') ?? '',
        body,
      };
    }
    throw new Error('too_many_redirects');
  } finally {
    clearTimeout(timer);
  }
}

/** HEAD/GET check that a cited URL is alive (LLD §11.2 step 5: drop 4xx/5xx). */
export async function isAlive(url: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    assertPublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      let res = await fetchImpl(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
      });
      if (res.status === 405 || res.status === 403) {
        res = await fetchImpl(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
        });
        await res.body?.cancel();
      }
      return res.status < 400;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
