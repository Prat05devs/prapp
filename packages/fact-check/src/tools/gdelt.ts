// GDELT DOC 2.0 API: which outlets covered it in the last 30 days (LLD §11.2 step 4).

export interface Coverage {
  url: string;
  title: string | null;
  domain: string;
  seenAt: string | null;
  language: string | null;
}

const STOP = new Set(
  'the a an and or of to in on for with is are was were be been this that these those it its as at by from has have had not no but if then than so such into about over after before'.split(
    ' ',
  ),
);

/** GDELT wants a short keyword query; quoted phrases > 3 words tend to return nothing. */
export function keywordQuery(claim: string, max = 6): string {
  const words = claim
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set(words)].slice(0, max).join(' ');
}

export async function gdeltCoverage(
  claim: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Coverage[]> {
  const q = keywordQuery(claim);
  if (!q) return [];
  const params = new URLSearchParams({
    query: q,
    mode: 'ArtList',
    format: 'json',
    maxrecords: '15',
    timespan: '30d',
    sort: 'HybridRel',
  });
  const res = await fetchImpl(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`gdelt_${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith('{')) return []; // GDELT answers plain text for bad queries
  const json = JSON.parse(text) as {
    articles?: {
      url: string;
      title?: string;
      domain?: string;
      seendate?: string;
      language?: string;
    }[];
  };
  return (json.articles ?? []).map((a) => ({
    url: a.url,
    title: a.title ?? null,
    domain: (a.domain ?? new URL(a.url).hostname).replace(/^www\./, ''),
    seenAt: a.seendate
      ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(9, 11)}:${a.seendate.slice(11, 13)}:00Z`
      : null,
    language: a.language ?? null,
  }));
}
