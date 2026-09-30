import type { FcConfidence, FcVerdict, SourceTier } from '../../shared/src/constants.ts';
import { domainOf } from './normalize.ts';
import type { Evidence, ExtractedClaims, LLM, WebSearch } from './providers/types.ts';
import { AllProvidersExhaustedError, LlmRouter, type QuotaStore } from './router.ts';
import { TIER_RANK, tierFor, type TrustedSources } from './sources.ts';
import { fetchArticle } from './tools/article.ts';
import { gdeltCoverage } from './tools/gdelt.ts';
import {
  isLikelySameClaim,
  searchClaims,
  searchImage,
  type ExistingFactCheck,
} from './tools/google-fact-check.ts';
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
const MAX_EVIDENCE = 8;

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

    // 4. Evidence (in parallel). Skip web search if an existing fact check already matched.
    const searchWeb = async (): Promise<Evidence[]> => {
      for (const s of deps.searches) {
        if (s.provider === 'gemini_search' && !(await deps.quota.use('gemini', s.model ?? ''))) {
          rec.skip('gemini_search', 'daily quota used');
          continue;
        }
        const tool: ToolName = s.provider === 'gemini_search' ? 'gemini_search' : 'searxng';
        const found = await rec.track(tool, () => s.find(claim.text, language), {
          model: s.model,
          summary: (ev) => `${ev.length} source(s) cited`,
        });
        if (found?.length) return found;
      }
      return [];
    };
    if (strongMatch && index === 0)
      rec.skip('gemini_search', 'an existing fact check already covers this claim');
    const [web, gdelt] = await Promise.all([
      !strongMatch && searchAllowed ? searchWeb() : Promise.resolve([] as Evidence[]),
      rec
        .track('gdelt', () => gdeltCoverage(claim.text, f), {
          summary: (c) => `${c.length} article(s) in the last 30 days`,
        })
        .then((c) =>
          (c ?? []).map((a): Evidence => ({
            url: a.url,
            title: a.title,
            snippet: null,
            domain: a.domain,
          })),
        ),
    ]);
    const wiki = await rec.track(
      'wikipedia',
      () => wikipediaContext(claim.text, { lang: language === 'hi' ? 'hi' : 'en', fetchImpl: f }),
      { summary: (w) => w.map((x) => x.title).join(', ') || 'no article' },
    );

    // 5. Score: trusted tiers first, drop dead links; the LLM may cite only these URLs.
    const seen = new Set(sources.map((s) => s.url));
    const unique: Evidence[] = [];
    for (const e of [...web, ...gdelt]) {
      if (!seen.has(e.url)) {
        seen.add(e.url);
        unique.push(e);
      }
    }
    const candidates = unique
      .sort(
        (a, b) =>
          TIER_RANK[tierFor(b.domain, deps.trusted)] - TIER_RANK[tierFor(a.domain, deps.trusted)],
      )
      .slice(0, MAX_EVIDENCE + 4);
    const alive = await Promise.all(
      candidates.map(async (e) => ((await isAlive(e.url, f)) ? e : null)),
    );
    const evidence = alive.filter((e): e is Evidence => e !== null).slice(0, MAX_EVIDENCE);

    // 6. Verdict
    let verdict: FcVerdict = 'unverified';
    let confidence: FcConfidence = 'low';
    let explanation: string | null = null;
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
        confidence = r.llm.isFallback ? lowerConfidence(r.value.confidence) : r.value.confidence;
        explanation = r.value.explanation || null;
        for (const s of r.value.stances) stances.set(s.url, s.stance);
      } catch (e) {
        llmUnavailable ||= e instanceof AllProvidersExhaustedError;
        rec.add('llm_judge', 'quota_exhausted', now().toISOString(), null, 'no model available');
      }
    }
    const reliable = evidence.some((e) => tierFor(e.domain, deps.trusted) !== 'unknown');
    if (!strongMatch && (!reliable || confidence === 'low')) {
      // Never a verdict without tier1/tier2 evidence (golden rule 9, LLD §11.2 step 6)
      verdict = 'unverified';
      confidence = 'low';
    }

    for (const e of evidence) {
      sources.push(
        toSource(e.url, deps.trusted, {
          title: e.title,
          stance: stances.get(e.url) ?? (web.includes(e) ? null : 'context'),
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
  const reduced =
    llmUnavailable && !claims.some((c) => c.sources.some((s) => s.isExistingFactCheck));
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
