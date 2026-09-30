import type { WebSearch } from './types.ts';

/** Optional self-hosted SearXNG (LLD §11.3). */
export function searxngSearch(opts: { baseUrl: string; fetchImpl?: typeof fetch }): WebSearch {
  const f = opts.fetchImpl ?? fetch;
  return {
    provider: 'searxng',
    model: null,
    async find(claim, language) {
      const params = new URLSearchParams({
        q: claim.slice(0, 300),
        format: 'json',
        language: language || 'en',
      });
      const res = await f(`${opts.baseUrl.replace(/\/+$/, '')}/search?${params}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`searxng_${res.status}`);
      const json = (await res.json()) as {
        results?: { url: string; title?: string; content?: string }[];
      };
      return (json.results ?? []).slice(0, 8).map((r) => ({
        url: r.url,
        title: r.title ?? null,
        snippet: r.content ?? null,
        domain: new URL(r.url).hostname.replace(/^www\./, ''),
      }));
    },
  };
}
