// Wikipedia REST: entity summaries for context (LLD §11.2 step 4).

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
}

export async function wikipediaContext(
  query: string,
  opts: { lang?: 'en' | 'hi'; limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<WikiSummary[]> {
  const f = opts.fetchImpl ?? fetch;
  const lang = opts.lang ?? 'en';
  // Wikimedia rejects requests without a descriptive User-Agent (HTTP 429/403).
  const headers = {
    'Api-User-Agent': 'NewsVio-FactCheck/1.0 (https://newsvio.in)',
    'User-Agent': 'NewsVio-FactCheck/1.0 (https://newsvio.in)',
  };
  const search = await f(
    // Full-text search: claim keywords rarely match an article title exactly.
    `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?${new URLSearchParams({ q: query.slice(0, 200), limit: String(opts.limit ?? 2) })}`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!search.ok) throw new Error(`wikipedia_${search.status}`);
  const pages = ((await search.json()) as { pages?: { key: string }[] }).pages ?? [];
  const out: WikiSummary[] = [];
  for (const p of pages) {
    const res = await f(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.key)}`,
      {
        headers,
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) continue;
    const s = (await res.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (s.extract && s.content_urls?.desktop?.page) {
      out.push({
        title: s.title ?? p.key,
        extract: s.extract.slice(0, 800),
        url: s.content_urls.desktop.page,
      });
    }
  }
  return out;
}
