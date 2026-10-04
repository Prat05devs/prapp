import type { Evidence } from '../providers/types.ts';

// Google News search RSS, India edition: free, no key, minutes-fresh, covers Indian outlets in
// English and Indian languages. Each item names its publisher, so tiering uses the publisher's
// domain (the item link itself is a news.google.com redirect that opens the article).

export interface NewsItem extends Evidence {
  publisher: string | null;
  publishedAt: string | null;
}

/** IFCN signatories and established Indian fact-check desks (LLD §11.2 step 3). */
const INDIAN_FACT_CHECKERS = [
  'factcheck.pib.gov.in',
  'altnews.in',
  'boomlive.in',
  'factly.in',
  'newschecker.in',
  'vishvasnews.com',
  'indiatoday.in/fact-check',
  'thequint.com/news/webqoof',
  'newsmobile.in',
  'factcrescendo.com',
  'newsmeter.in',
  'thip.media',
  'logicallyfacts.com',
];

/** Social networks and aggregators echo claims; they are never evidence on their own. */
const NOT_EVIDENCE =
  /(^|\.)(facebook|instagram|x|twitter|youtube|threads|sharechat|dailyhunt|msn|yahoo)\.com$|(^|\.)t\.me$/;

/** Google News languages per claim language; unknown languages search in English. */
const ENGLISH = { hl: 'en-IN', ceid: 'IN:en' };
const EDITIONS: Record<string, { hl: string; ceid: string }> = {
  en: ENGLISH,
  hi: { hl: 'hi', ceid: 'IN:hi' },
  bn: { hl: 'bn', ceid: 'IN:bn' },
  mr: { hl: 'mr', ceid: 'IN:mr' },
  ta: { hl: 'ta', ceid: 'IN:ta' },
  te: { hl: 'te', ceid: 'IN:te' },
  ml: { hl: 'ml', ceid: 'IN:ml' },
  gu: { hl: 'gu', ceid: 'IN:gu' },
  kn: { hl: 'kn', ceid: 'IN:kn' },
  pa: { hl: 'pa', ceid: 'IN:pa' },
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

function tag(item: string, name: string): string | null {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(item);
  return m?.[1] !== undefined ? decodeXml(m[1]).trim() : null;
}

/** Parses a Google News RSS document. Exported for tests. */
export function parseNewsRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1] ?? '';
    const link = tag(item, 'link');
    const rawTitle = tag(item, 'title');
    const sourceUrl = /<source url="([^"]+)"/.exec(item)?.[1];
    const publisher = tag(item, 'source');
    if (!link || !rawTitle || !sourceUrl) continue;
    let domain: string;
    try {
      domain = new URL(decodeXml(sourceUrl)).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      continue;
    }
    if (NOT_EVIDENCE.test(domain)) continue;
    // Titles end with " - Publisher"; the description lists related headlines from other outlets.
    const title = publisher
      ? rawTitle.replace(new RegExp(`\\s+-\\s+${escapeRe(publisher)}$`), '')
      : rawTitle;
    const related = (tag(item, 'description') ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const pub = tag(item, 'pubDate');
    const date = pub ? new Date(pub) : null;
    out.push({
      url: link,
      title,
      snippet: related && related !== title ? related.slice(0, 400) : null,
      domain,
      publisher,
      publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    });
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface NewsSearchOptions {
  language?: string;
  /** limit to the last N days (Google's when: operator); omit for all time */
  days?: number;
  fetchImpl?: typeof fetch;
  max?: number;
  /** query for the Bing fallback when it must differ (site: filters) */
  bingQuery?: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function googleNews(q: string, opts: NewsSearchOptions): Promise<NewsItem[]> {
  const edition = EDITIONS[opts.language ?? 'en'] ?? ENGLISH;
  const params = new URLSearchParams({
    q: opts.days ? `${q} when:${opts.days}d` : q,
    hl: edition.hl,
    gl: 'IN',
    ceid: edition.ceid,
  });
  const f = opts.fetchImpl ?? fetch;
  // Google throttles bursts from shared cloud addresses (503/429): one retry after a pause.
  for (let attempt = 0; ; attempt++) {
    const res = await f(`https://news.google.com/rss/search?${params}`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': `${edition.hl},en;q=0.8` },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) return parseNewsRss(await res.text());
    if (attempt === 0 && (res.status === 503 || res.status === 429)) {
      await sleep(1_500);
      continue;
    }
    throw new Error(`google_news_${res.status}`);
  }
}

/** Bing News RSS: backup when Google News throttles. Links carry the real article URL. */
export function parseBingRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1] ?? '';
    const link = tag(item, 'link');
    const title = tag(item, 'title');
    if (!link || !title) continue;
    let url = link;
    try {
      url = new URL(link).searchParams.get('url') ?? link;
    } catch {
      continue;
    }
    let domain: string;
    try {
      domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      continue;
    }
    if (domain === 'bing.com' || NOT_EVIDENCE.test(domain)) continue;
    const pub = tag(item, 'pubDate');
    const date = pub ? new Date(pub) : null;
    out.push({
      url,
      title,
      snippet: tag(item, 'description'),
      domain,
      publisher: tag(item, 'News:Source'),
      publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    });
  }
  return out;
}

async function bingNews(q: string, opts: NewsSearchOptions): Promise<NewsItem[]> {
  const lang = opts.language && opts.language !== 'en' ? opts.language : 'en';
  const params = new URLSearchParams({
    q,
    format: 'rss',
    cc: 'IN',
    setlang: `${lang}-IN`,
  });
  const res = await (opts.fetchImpl ?? fetch)(`https://www.bing.com/news/search?${params}`, {
    headers: { 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`bing_news_${res.status}`);
  return parseBingRss(await res.text());
}

/** News reports for a query: Google News, falling back to Bing News when it fails or is empty. */
export async function searchNews(query: string, opts: NewsSearchOptions = {}): Promise<NewsItem[]> {
  const q = query.trim();
  if (!q) return [];
  let items: NewsItem[] = [];
  let googleError: unknown = null;
  try {
    items = await googleNews(q, opts);
  } catch (e) {
    googleError = e;
  }
  if (!items.length) {
    try {
      items = await bingNews(opts.bingQuery ?? q, opts);
    } catch (e) {
      throw googleError ?? e;
    }
  }
  return items.slice(0, opts.max ?? 10);
}

/** Articles from Indian fact-check desks about the claim, any date (old hoaxes resurface). */
export async function searchFactCheckers(
  query: string,
  opts: Omit<NewsSearchOptions, 'days'> = {},
): Promise<NewsItem[]> {
  const sites = INDIAN_FACT_CHECKERS.map((s) => `site:${s}`).join(' OR ');
  // Bing's site: takes host names only.
  const hosts = [...new Set(INDIAN_FACT_CHECKERS.map((s) => s.split('/')[0]))];
  return searchNews(`${query} (${sites})`, {
    ...opts,
    max: opts.max ?? 6,
    bingQuery: `${query} (${hosts.map((h) => `site:${h}`).join(' OR ')})`,
  });
}
