// Google Fact Check Tools API (LLD §11.2 step 3). Named in plain text in reports, never with logos.

export interface ExistingFactCheck {
  claimText: string;
  claimant: string | null;
  url: string;
  publisher: string | null;
  publisherSite: string | null;
  rating: string | null;
  reviewDate: string | null;
  title: string | null;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'been',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'और',
  'का',
  'की',
  'के',
  'को',
  'पर',
  'से',
  'है',
  'हैं',
  'यह',
  'वह',
]);

const NEGATIONS = new Set(['no', 'not', 'never', 'without', 'न', 'नहीं', 'मत']);

function claimTokens(text: string): string[] {
  return (
    text
      .normalize('NFKC')
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).filter((token) => (token.length > 1 || /^\d+$/.test(token)) && !STOP_WORDS.has(token));
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

/**
 * Google Fact Check search returns retrieval candidates, not verified matches or relevance scores.
 * DECISION: before reusing a candidate's rating automatically, require conservative lexical
 * agreement plus matching numbers and negation. A false negative merely falls through to the
 * normal evidence pipeline; a false positive would attach an unrelated verdict to the claim.
 */
export function isLikelySameClaim(input: string, candidate: string): boolean {
  const inputTokens = new Set(claimTokens(input));
  const candidateTokens = new Set(claimTokens(candidate));
  if (inputTokens.size < 2 || candidateTokens.size < 2) return false;

  const inputNegated = [...inputTokens].some((token) => NEGATIONS.has(token));
  const candidateNegated = [...candidateTokens].some((token) => NEGATIONS.has(token));
  if (inputNegated !== candidateNegated) return false;

  const inputNumbers = new Set([...inputTokens].filter((token) => /^\d+$/.test(token)));
  const candidateNumbers = new Set([...candidateTokens].filter((token) => /^\d+$/.test(token)));
  if (!setEquals(inputNumbers, candidateNumbers)) return false;

  const overlap = [...inputTokens].filter((token) => candidateTokens.has(token)).length;
  const shorter = Math.min(inputTokens.size, candidateTokens.size);
  const longer = Math.max(inputTokens.size, candidateTokens.size);
  const dice = (2 * overlap) / (inputTokens.size + candidateTokens.size);

  return (
    overlap >= Math.min(3, shorter) &&
    overlap / shorter >= 0.8 &&
    overlap / longer >= 0.55 &&
    dice >= 0.65
  );
}

interface ApiClaim {
  text?: string;
  claimant?: string;
  claimReview?: {
    publisher?: { name?: string; site?: string };
    url?: string;
    title?: string;
    reviewDate?: string;
    textualRating?: string;
  }[];
}

function flatten(claims: ApiClaim[] | undefined): ExistingFactCheck[] {
  const out: ExistingFactCheck[] = [];
  for (const c of claims ?? []) {
    for (const r of c.claimReview ?? []) {
      if (!r.url) continue;
      out.push({
        claimText: c.text ?? '',
        claimant: c.claimant ?? null,
        url: r.url,
        publisher: r.publisher?.name ?? null,
        publisherSite: r.publisher?.site ?? null,
        rating: r.textualRating ?? null,
        reviewDate: r.reviewDate ?? null,
        title: r.title ?? null,
      });
    }
  }
  return out;
}

export async function searchClaims(
  query: string,
  opts: { apiKey: string; languageCode?: string; fetchImpl?: typeof fetch },
): Promise<ExistingFactCheck[]> {
  const params = new URLSearchParams({
    query: query.slice(0, 500),
    key: opts.apiKey,
    pageSize: '10',
  });
  if (opts.languageCode) params.set('languageCode', opts.languageCode);
  const res = await (opts.fetchImpl ?? fetch)(
    `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (res.status === 429) throw new Error('quota_exhausted');
  if (!res.ok) throw new Error(`factcheck_${res.status}`);
  return flatten(((await res.json()) as { claims?: ApiClaim[] }).claims);
}

/** Image search needs a public image URL. */
export async function searchImage(
  imageUrl: string,
  opts: { apiKey: string; fetchImpl?: typeof fetch },
): Promise<ExistingFactCheck[]> {
  const params = new URLSearchParams({ imageUri: imageUrl, key: opts.apiKey, pageSize: '10' });
  const res = await (opts.fetchImpl ?? fetch)(
    `https://factchecktools.googleapis.com/v1alpha1/claims:imageSearch?${params}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (res.status === 429) throw new Error('quota_exhausted');
  if (!res.ok) throw new Error(`factcheck_image_${res.status}`);
  const json = (await res.json()) as { results?: { claim?: ApiClaim }[] };
  return flatten((json.results ?? []).map((r) => r.claim ?? {}));
}
