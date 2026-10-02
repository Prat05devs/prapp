import type { FcConfidence, FcVerdict, SourceTier } from '../../shared/src/constants.ts';
import { domainOf } from './normalize.ts';
import type { Evidence, ExtractedClaims, LLM, WebSearch } from './providers/types.ts';
import { AllProvidersExhaustedError, LlmRouter, type QuotaStore } from './router.ts';
import { TIER_RANK, tierFor, type TrustedSources } from './sources.ts';
import { fetchArticle } from './tools/article.ts';
import { gdeltCoverage, keywordQuery } from './tools/gdelt.ts';
import {
  isLikelySameClaim,
  searchClaims,
  searchImage,
  type ExistingFactCheck,
} from './tools/google-fact-check.ts';
import { searchFactCheckers, searchNews, type NewsItem } from './tools/google-news.ts';
import { isAlive } from './tools/http.ts';
import { domainAgeDays } from './tools/rdap.ts';
import { wikipediaContext } from './tools/wikipedia.ts';
import {
  FactCheckInputError,
  type ClaimOut,
  type FactCheckInput,
  type PipelineResult,
  type SourceOut,
  type Stance,
  type ToolName,
  type ToolRun,
  type ToolStatus,
} from './types.ts';
import { lowerConfidence, minConfidence, overallVerdict, verdictFromRating } from './verdict.ts';

// LLD §11.2. Every external step is recorded as a tool run so the report can say exactly
// how the verdict was reached ("How we checked this").

export interface PipelineDeps {
  /** in order of preference: Gemini first, then free fallbacks */
  llms: LLM[];
  /** in order: Gemini grounding, SearXNG */
  searches: WebSearch[];
  quota: QuotaStore;
  trusted: TrustedSources;
  factCheckApiKey?: string;
  /** public (signed) URL of the uploaded screenshot for the image search */
  imageUrl?: string | null;
  /** OCR fallback when no vision LLM is available (tesseract.js in the worker) */
  ocrFallback?: (image: { bytes: Uint8Array; mimeType: string }) => Promise<string>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const GEMINI_THROTTLE_RATIO = 0.8;
const MAX_EVIDENCE = 10;

class Recorder {
  runs: ToolRun[] = [];
  constructor(private readonly now: () => Date) {}

  async track<T>(
    tool: ToolName,
    fn: () => Promise<T>,
    opts: { model?: string | null; summary?: (v: T) => string | null } = {},
  ): Promise<T | null> {
    const startedAt = this.now().toISOString();
    try {
      const value = await fn();
      this.add(tool, 'ok', startedAt, opts.model ?? null, opts.summary?.(value) ?? null);
      return value;
    } catch (e) {
      const exhausted =
        e instanceof AllProvidersExhaustedError ||
        (e instanceof Error && e.message === 'quota_exhausted');
      this.add(
        tool,
        exhausted ? 'quota_exhausted' : 'failed',
        startedAt,
        opts.model ?? null,
        e instanceof Error ? e.message.slice(0, 200) : null,
      );
      if (e instanceof FactCheckInputError) throw e;
      return null;
    }
  }

  add(
    tool: ToolName,
    status: ToolStatus,
    startedAt: string,
    model: string | null,
    summary: string | null,
  ) {
    this.runs.push({
      tool,
      model,
      status,
      startedAt,
      finishedAt: this.now().toISOString(),
      summary,
    });
  }

  skip(tool: ToolName, reason: string) {
    const t = this.now().toISOString();
    this.runs.push({
      tool,
      model: null,
      status: 'skipped',
      startedAt: t,
      finishedAt: t,
      summary: reason,
    });
  }
}

const GOV_WORDS =
  /\b(government|govt|ministry|scheme|yojana|pm |prime minister|chief minister|rbi|reserve bank|notice|circular|gazette|police|court|election|aadhaar|pan card|ration|pension|subsidy|currency|note ban|सरकार|योजना|मंत्रालय|प्रधानमंत्री|मुख्यमंत्री|पुलिस)\b/i;

function guessLanguage(text: string): string {
  return /[ऀ-ॿ]/.test(text) ? 'hi' : 'en';
}

/** Reduced mode without an LLM: the message itself is the claim (LLD §11.3). */
function fallbackClaims(text: string): ExtractedClaims {
  const first = text.replace(/\s+/g, ' ').trim().slice(0, 300);
  return {
    language: guessLanguage(text),
    claims: [{ text: first, isGovernmentRelated: GOV_WORDS.test(text) }],
  };
}

function toSource(url: string, trusted: TrustedSources, extra: Partial<SourceOut> = {}): SourceOut {
  const domain = domainOf(url) ?? url;
  return {
    url,
    domain,
    title: null,
    publisher: null,
    tier: tierFor(domain, trusted),
    stance: null,
    isExistingFactCheck: false,
    rating: null,
    publishedAt: null,
    ...extra,
  };
}

/** English query first, then one in the claim's language; keyword fallback without an LLM. */
function claimQueries(
  claim: { text: string; queries?: string[] },
  language: string,
): { q: string; lang: string }[] {
  const given = claim.queries ?? [];
  const out: { q: string; lang: string }[] = [];
  if (given[0]) out.push({ q: given[0], lang: 'en' });
  if (given[1] && language !== 'en') out.push({ q: given[1], lang: language });
  if (!out.length) out.push({ q: keywordQuery(claim.text, 8), lang: language });
  return out.filter((x) => x.q.trim().length > 2);
}

function titleKey(title: string | null): string {
  return (title ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 80);
}

export async function runFactCheck(
  input: FactCheckInput,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const now = deps.now ?? (() => new Date());
  const f = deps.fetchImpl ?? fetch;
  const rec = new Recorder(now);
  const router = new LlmRouter(deps.llms, deps.quota);
  let llmUnavailable = false;

  // ---- 1. Normalise ---------------------------------------------------------
  let text = input.text ?? '';
  let inputDomain: string | null = null;
  let inputDomainTier: SourceTier | null = null;
  let inputDomainAgeDays: number | null = null;
  const imageMatches: ExistingFactCheck[] = [];

  if (input.inputType === 'url' && input.url) {
    const inputUrl = input.url;
    const domain = domainOf(inputUrl);
    inputDomain = domain;
    inputDomainTier = tierFor(domain, deps.trusted);
    const article = await rec.track('fetch_url', () => fetchArticle(inputUrl, f), {
      summary: (a) => a.title,
    });
    text = article ? `${article.title ?? ''}\n\n${article.text}`.trim() : inputUrl;
    if (domain) {
      inputDomainAgeDays = await rec.track(
        'rdap',
        () => domainAgeDays(domain, f, now().getTime()),
        {
          summary: (d) => (d === null ? 'no registration date' : `registered ${d} days ago`),
        },
      );
    }
  }

  if (input.inputType === 'image' && input.image) {
    const image = input.image;
    let ocrText: string | null = null;
    let ocrRan = false;
    try {
      const r = await router.run(
        (llm) => (llm.ocr ? llm.ocr(image) : Promise.reject(new Error('no_ocr'))),
        (llm) => typeof llm.ocr === 'function',
      );
      rec.add('ocr', 'ok', now().toISOString(), r.llm.model, null);
      ocrText = r.value;
      ocrRan = true;
    } catch {
      const fallback = deps.ocrFallback;
      if (fallback) {
        ocrText = await rec.track('ocr', () => fallback(image), { model: 'tesseract.js' });
        ocrRan = ocrText !== null;
      } else {
        rec.add('ocr', 'quota_exhausted', now().toISOString(), null, 'no OCR provider available');
      }
    }
    // OCR that could not run is retried later; OCR that found nothing ends the job.
    if (!ocrRan) throw new Error('ocr_unavailable');
    if (!ocrText || ocrText.replace(/\s+/g, '').length < 8)
      throw new FactCheckInputError('no_text_in_image');
    text = ocrText;

    const factCheckKey = deps.factCheckApiKey;
    const imageUrl = deps.imageUrl;
    if (factCheckKey && imageUrl) {
      const found = await rec.track(
        'google_fact_check_image',
        () => searchImage(imageUrl, { apiKey: factCheckKey, fetchImpl: f }),
        {
          summary: (m) => `${m.length} review(s) found`,
        },
      );
      imageMatches.push(...(found ?? []));
    } else {
      rec.skip('google_fact_check_image', 'not configured');
    }
  }

  // ---- 2. Extract claims ----------------------------------------------------
  let extracted: ExtractedClaims;
  try {
    const r = await router.run((llm) => llm.extractClaims(text));
    rec.add(
      'claim_extraction',
      'ok',
      now().toISOString(),
      r.llm.model,
      `${r.value.claims.length} claim(s)`,
    );
    extracted = r.value.claims.length ? r.value : fallbackClaims(text);
  } catch (e) {
    llmUnavailable = e instanceof AllProvidersExhaustedError;
    rec.add(
      'claim_extraction',
      'quota_exhausted',
      now().toISOString(),
      null,
      'used the message as the claim',
    );
    extracted = fallbackClaims(text);
  }
  const language = extracted.language || guessLanguage(text);

  // Guests lose live web search when Gemini is at 80 % of its daily quota (LLD §11.3).
  let searchAllowed = !llmUnavailable;
  if (searchAllowed && input.isGuest) {
    const gemini = deps.searches.find((s) => s.provider === 'gemini_search');
    if (
      gemini &&
      (await deps.quota.usageRatio('gemini', gemini.model ?? '')) >= GEMINI_THROTTLE_RATIO
    ) {
      searchAllowed = false;
      rec.skip('gemini_search', 'high demand: live web search is reserved for signed-in users');
    }
  }

  // ---- 3–6. Per claim -------------------------------------------------------
  const claims: ClaimOut[] = [];
  const confidences: FcConfidence[] = [];

  for (const [index, claim] of extracted.claims.entries()) {
    const sources: SourceOut[] = [];

    // 3. Existing fact checks
    let existing: ExistingFactCheck[] = [...imageMatches];
    const claimSearchKey = deps.factCheckApiKey;
    if (claimSearchKey) {
      const found = await rec.track(
        'google_fact_check',
        () =>
          searchClaims(claim.text, {
            apiKey: claimSearchKey,
            languageCode: language === 'hi' ? 'hi' : 'en',
            fetchImpl: f,
          }),
        { summary: (m) => `${m.length} review(s) found` },
      );
      existing = [...existing, ...(found ?? [])];
    } else if (index === 0) {
      rec.skip('google_fact_check', 'not configured');
    }
    const matched = existing.filter((item) => isLikelySameClaim(claim.text, item.claimText));
    if (existing.length) {
      rec.add(
        'claim_matching',
        'ok',
        now().toISOString(),
        null,
        `${matched.length}/${existing.length} candidate review(s) matched the same claim`,
      );
    }
    const rated = matched
      .map((m) => ({ m, v: verdictFromRating(m.rating) }))
      .filter((x): x is { m: ExistingFactCheck; v: FcVerdict } => x.v !== null)
      .slice(0, 3);
    for (const { m } of rated) {
      sources.push(
        toSource(m.url, deps.trusted, {
          title: m.title,
          publisher: m.publisher,
          isExistingFactCheck: true,
          rating: m.rating,
          publishedAt: m.reviewDate,
          stance: 'context',
          tier:
            tierFor(domainOf(m.url), deps.trusted) === 'unknown'
              ? 'tier1'
              : tierFor(domainOf(m.url), deps.trusted),
        }),
      );
    }
    const strongMatch = rated.length > 0;

    // 4. Evidence (in parallel). News search is free and always runs; the generic web search
    //    is skipped when an existing fact check already matched.
    const queries = claimQueries(claim, language);
    const searchWeb = async (): Promise<Evidence[]> => {
      for (const s of deps.searches) {
        if (s.provider === 'gemini_search' && !(await deps.quota.use('gemini', s.model ?? ''))) {
          rec.skip('gemini_search', 'daily quota used');
          continue;
        }
        const tool: ToolName = s.provider === 'gemini_search' ? 'gemini_search' : 'searxng';
        const found = await rec.track(tool, () => s.find(queries[0]?.q ?? claim.text, language), {
          model: s.model,
          summary: (ev) => `${ev.length} source(s) cited`,
        });
        if (found?.length) return found;
      }
      return [];
    };
    // One query at a time per search: bursts from a shared cloud address get throttled.
    const searchAllNews = async (): Promise<NewsItem[]> => {
      const out: NewsItem[] = [];
      for (const x of queries)
        out.push(...(await searchNews(x.q, { language: x.lang, fetchImpl: f, max: 10 })));
      return out;
    };
    const searchAllFactCheckers = async (): Promise<NewsItem[]> => {
      const out: NewsItem[] = [];
      for (const x of queries)
        out.push(...(await searchFactCheckers(x.q, { language: x.lang, fetchImpl: f })));
      return out.map((e) => ({ ...e, isFactCheck: true }));
    };
    if (strongMatch && index === 0)
      rec.skip('gemini_search', 'an existing fact check already covers this claim');
    const [web, news, checkers, gdelt] = await Promise.all([
      !strongMatch && searchAllowed && deps.searches.length
        ? searchWeb()
        : Promise.resolve([] as Evidence[]),
      rec
        .track('google_news', searchAllNews, {
          summary: (n) =>
            `${n.length} news report(s) from ${new Set(n.map((x) => x.domain)).size} outlet(s)`,
        })
        .then((n) => n ?? []),
      rec
        .track('fact_checker_search', searchAllFactCheckers, {
          summary: (n) => `${n.length} fact-check article(s)`,
        })
        .then((n) => n ?? []),
      rec
        .track('gdelt', () => gdeltCoverage(queries[0]?.q ?? claim.text, f), {
          summary: (c) => `${c.length} article(s) in the last 30 days`,
        })
        .then((c) =>
          (c ?? []).map((a): Evidence => ({
            url: a.url,
            title: a.title,
            snippet: null,
            domain: a.domain,
            publishedAt: a.seenAt,
          })),
        ),
    ]);
    const wiki = await rec.track(
      'wikipedia',
      () => wikipediaContext(queries[0]?.q ?? claim.text, { lang: 'en', fetchImpl: f }),
      { summary: (w) => w.map((x) => x.title).join(', ') || 'no article' },
    );

    // 5. Score: fact-check articles first, then trusted tiers, then recency. One item per
    //    headline; the LLM may cite only these URLs.
    const seen = new Set(sources.map((s) => s.url));
    const seenTitles = new Set<string>();
    const unique: Evidence[] = [];
    for (const e of [...checkers, ...news, ...web, ...gdelt]) {
      const key = titleKey(e.title);
      if (seen.has(e.url) || (key && seenTitles.has(key))) continue;
      seen.add(e.url);
      if (key) seenTitles.add(key);
      unique.push({ ...e, tier: tierFor(e.domain, deps.trusted) });
    }
    const time = (e: Evidence) => (e.publishedAt ? Date.parse(e.publishedAt) || 0 : 0);
    const candidates = unique
      .sort(
        (a, b) =>
          Number(Boolean(b.isFactCheck)) - Number(Boolean(a.isFactCheck)) ||
          TIER_RANK[b.tier ?? 'unknown'] - TIER_RANK[a.tier ?? 'unknown'] ||
          time(b) - time(a),
      )
      .slice(0, MAX_EVIDENCE + 4);
    // News items are fresh Google News redirects; only check other links are alive.
    const fromNews = new Set([...news, ...checkers].map((e) => e.url));
    const alive = await Promise.all(
      candidates.map(async (e) => (fromNews.has(e.url) || (await isAlive(e.url, f)) ? e : null)),
    );
    const evidence = alive.filter((e): e is Evidence => e !== null).slice(0, MAX_EVIDENCE);
    // Encyclopedic background helps with settled, older facts that headlines summarise loosely.
    for (const w of wiki ?? []) {
      if (!evidence.some((e) => e.url === w.url)) {
        evidence.push({
          url: w.url,
          title: w.title,
          snippet: w.extract,
          domain: domainOf(w.url) ?? 'wikipedia.org',
          publisher: 'Wikipedia',
          tier: tierFor(domainOf(w.url), deps.trusted),
        });
      }
    }

    // 6. Verdict
    let verdict: FcVerdict = 'unverified';
    let confidence: FcConfidence = 'low';
    let explanation: string | null = null;
    /** the judge's own confidence, before the fallback-model adjustment */
    let judged: FcConfidence = 'low';
    const stances = new Map<string, Stance>();

    if (strongMatch) {
      verdict = overallVerdict(rated.map((r) => r.v));
      confidence = rated.length > 1 ? 'high' : 'medium';
      const top = rated[0]?.m;
      explanation = top
        ? `${top.publisher ?? 'A fact-checker'} rated a matching claim as "${top.rating}".`
        : null;
    } else if (!llmUnavailable && evidence.length) {
      try {
        const r = await router.run((llm) => llm.judge(claim.text, evidence, language));
        rec.add(
          'llm_judge',
          'ok',
          now().toISOString(),
          r.llm.model,
          `${r.value.verdict} (${r.value.confidence})`,
        );
        verdict = r.value.verdict;
        judged = r.value.confidence;
        confidence = r.llm.isFallback ? lowerConfidence(r.value.confidence) : r.value.confidence;
        explanation = r.value.explanation || null;
        for (const s of r.value.stances) stances.set(s.url, s.stance);
      } catch (e) {
        llmUnavailable ||= e instanceof AllProvidersExhaustedError;
        rec.add('llm_judge', 'quota_exhausted', now().toISOString(), null, 'no model available');
      }
    }
    // Never a verdict without tier1/tier2 evidence that the judge actually relied on
    // (golden rule 9, LLD §11.2 step 6).
    const relied = evidence.filter(
      (e) =>
        e.tier !== 'unknown' &&
        (stances.get(e.url) === 'supports' || stances.get(e.url) === 'refutes'),
    );
    const reliedPublishers = new Set(relied.map((e) => e.domain)).size;
    if (!strongMatch && (reliedPublishers === 0 || judged === 'low')) {
      verdict = 'unverified';
      confidence = 'low';
    } else if (!strongMatch && confidence === 'high' && reliedPublishers < 2) {
      confidence = 'medium';
    }

    for (const e of evidence) {
      sources.push(
        toSource(e.url, deps.trusted, {
          domain: e.domain,
          tier: e.tier ?? tierFor(e.domain, deps.trusted),
          title: e.title,
          publisher: e.publisher ?? null,
          publishedAt: e.publishedAt ?? null,
          stance: stances.get(e.url) ?? 'context',
        }),
      );
    }
    for (const w of wiki ?? []) {
      if (!sources.some((s) => s.url === w.url)) {
        sources.push(
          toSource(w.url, deps.trusted, {
            title: w.title,
            publisher: 'Wikipedia',
            stance: 'context',
          }),
        );
      }
    }

    claims.push({
      position: index + 1,
      claimText: claim.text,
      verdict,
      explanation:
        explanation ??
        (llmUnavailable
          ? 'We could not run the full analysis right now. A full check is pending.'
          : 'We did not find enough reliable evidence to confirm or refute this claim.'),
      isGovernmentRelated: claim.isGovernmentRelated,
      sources,
    });
    confidences.push(confidence);
  }

  const verdict = overallVerdict(claims.map((c) => c.verdict));
  const worst = claims.find((c) => c.verdict === verdict) ?? claims[0];
  // Reduced only when no claim got an answer; a model failing on a later claim must not
  // throw away verdicts already reached for the others.
  const reduced =
    llmUnavailable &&
    !claims.some((c) => c.verdict !== 'unverified' || c.sources.some((s) => s.isExistingFactCheck));
  const confidence =
    verdict === 'unverified'
      ? 'low'
      : minConfidence(confidences.filter((_, i) => claims[i]?.verdict !== 'unverified'));

  return {
    language,
    summary: worst?.explanation ?? 'No checkable claim was found.',
    verdict: reduced ? 'unverified' : verdict,
    confidence: reduced ? 'low' : confidence,
    mode: llmUnavailable ? 'reduced' : 'full',
    fullCheckStatus: llmUnavailable ? 'queued' : 'not_needed',
    inputDomain,
    inputDomainTier,
    inputDomainAgeDays,
    claims,
    toolRuns: rec.runs,
  };
}
