import type { FcInputType } from '../../shared/src/constants.ts';

// Cache key (LLD §11.1 step 3): sha256(type + normalised input).

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|igshid|mc_cid|mc_eid|ref|ref_src|si|s|feature)$/i;

export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = '';
  u.hostname = u.hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/^m\./, '');
  for (const key of [...u.searchParams.keys()])
    if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
  return u.toString().replace(/^http:\/\//, 'https://');
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** For images the hash is over the bytes (same screenshot → same cache entry). */
export async function inputHash(type: FcInputType, value: string | Uint8Array): Promise<string> {
  if (type === 'image') return sha256Hex(`image:${await sha256Hex(value as Uint8Array)}`);
  const normalised =
    type === 'url' ? normalizeUrl(value as string) : normalizeText(value as string);
  return sha256Hex(`${type}:${normalised}`);
}

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}
