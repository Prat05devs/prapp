import { describe, expect, it } from 'vitest';
import { runFactCheck, type PipelineDeps } from './pipeline.ts';
import { QuotaExhaustedError, type Evidence, type LLM, type WebSearch } from './providers/types.ts';
import type { QuotaStore } from './router.ts';
import { FactCheckInputError, type FactCheckInput } from './types.ts';

const trusted = new Map([
  ['pib.gov.in', 'tier1' as const],
  ['boomlive.in', 'tier1' as const],
  ['thehindu.com', 'tier2' as const],
]);

function quota(exhausted: string[] = [], ratio = 0): QuotaStore {
  return { use: async (p) => !exhausted.includes(p), usageRatio: async () => ratio };
}

function fakeLlm(over: Partial<LLM> = {}): LLM {
  return {
    provider: 'gemini',
    model: 'gemini-test',
    isFallback: false,
    extractClaims: async () => ({
      language: 'en',
      claims: [{ text: 'RBI will ban 500 rupee notes', isGovernmentRelated: true }],
    }),
    judge: async (_c, evidence) => ({
      verdict: 'likely_false',
      confidence: 'high',
      explanation: 'Official sources say no such ban is planned.',
      stances: evidence.map((e) => ({ url: e.url, stance: 'refutes' as const })),
    }),
    ocr: async () => 'RBI will ban 500 rupee notes from next month',
    ...over,
  };
}

function fakeSearch(evidence: Evidence[]): WebSearch {
  return { provider: 'gemini_search', model: 'gemini-test', find: async () => evidence };
}

/** Routes the tools' HTTP calls: fact check API, GDELT, Wikipedia, liveness checks. */
function fakeFetch(opts: { factChecks?: unknown[] } = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('factchecktools')) return Response.json({ claims: opts.factChecks ?? [] });
    if (url.includes('gdeltproject')) return Response.json({ articles: [] });
    if (url.includes('wikipedia.org/w/rest.php')) return Response.json({ pages: [] });
    return new Response('ok', { status: 200 });
  }) as typeof fetch;
}

const textInput: FactCheckInput = {
  id: 'fc1',
  inputType: 'text',
  text: 'Forward: RBI will ban 500 rupee notes from next month. Share with everyone!',
  url: null,
  image: null,
  isGuest: false,
};

function deps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    llms: [fakeLlm()],
    searches: [
      fakeSearch([
        {
          url: 'https://pib.gov.in/release/1',
          title: 'PIB',
          snippet: 'No plan to ban notes',
          domain: 'pib.gov.in',
        },
      ]),
    ],
    quota: quota(),
    trusted,
    factCheckApiKey: 'key',
    fetchImpl: fakeFetch(),
    ...over,
  };
}

describe('runFactCheck', () => {
  it('uses an existing fact check and skips web search', async () => {
    const r = await runFactCheck(
      textInput,
      deps({
        fetchImpl: fakeFetch({
          factChecks: [
            {
              text: 'RBI will ban 500 rupee notes from next month',
              claimReview: [
                {
                  publisher: { name: 'BOOM', site: 'boomlive.in' },
                  url: 'https://www.boomlive.in/fake-news/rbi-500',
                  textualRating: 'False',
                },
              ],
            },
          ],
        }),
      }),
    );
    expect(r.verdict).toBe('likely_false');
    expect(r.mode).toBe('full');
    const src = r.claims[0]?.sources[0];
    expect(src).toMatchObject({
      isExistingFactCheck: true,
      rating: 'False',
      publisher: 'BOOM',
      tier: 'tier1',
    });
    expect(r.toolRuns.find((t) => t.tool === 'gemini_search')?.status).toBe('skipped');
    expect(r.toolRuns.find((t) => t.tool === 'google_fact_check')?.status).toBe('ok');
    expect(r.toolRuns.find((t) => t.tool === 'claim_matching')?.summary).toBe(
      '1/1 candidate review(s) matched the same claim',
    );
  });

  it('does not reuse a rating from an unrelated claim about the same subject', async () => {
    const r = await runFactCheck(
      {
        ...textInput,
        text: 'The Eiffel Tower is located in Paris, France.',
      },
      deps({
        fetchImpl: fakeFetch({
          factChecks: [
            {
              text: 'Videos show the Eiffel Tower ablaze',
              claimReview: [
                {
                  publisher: { name: 'AFP Fact Check', site: 'factcheck.afp.com' },
                  url: 'https://factcheck.afp.com/eiffel-tower-fire-rumor',
                  textualRating: 'False',
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(r.claims[0]?.sources).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://factcheck.afp.com/eiffel-tower-fire-rumor' }),
      ]),
    );
    expect(r.toolRuns.find((t) => t.tool === 'claim_matching')?.summary).toBe(
      '0/1 candidate review(s) matched the same claim',
    );
  });

  it('judges with trusted evidence and records the model', async () => {
    const r = await runFactCheck(textInput, deps());
    expect(r.verdict).toBe('likely_false');
    expect(r.confidence).toBe('high');
    expect(r.claims[0]?.isGovernmentRelated).toBe(true);
    expect(r.claims[0]?.sources[0]).toMatchObject({
      url: 'https://pib.gov.in/release/1',
      tier: 'tier1',
      stance: 'refutes',
    });
    expect(r.toolRuns.find((t) => t.tool === 'llm_judge')).toMatchObject({
      status: 'ok',
      model: 'gemini-test',
    });
    expect(r.summary).toBe('Official sources say no such ban is planned.');
  });

  it('is unverified when only unknown-tier evidence exists', async () => {
    const r = await runFactCheck(
      textInput,
      deps({
        searches: [
          fakeSearch([
            {
              url: 'https://random-blog.example/x',
              title: 'x',
              snippet: 'x',
              domain: 'random-blog.example',
            },
          ]),
        ],
      }),
    );
    expect(r.verdict).toBe('unverified');
    expect(r.confidence).toBe('low');
  });

  it('a fallback model lowers confidence', async () => {
    const r = await runFactCheck(
      textInput,
      deps({
        llms: [
          fakeLlm({
            extractClaims: async () => {
              throw new QuotaExhaustedError('gemini');
            },
            judge: async () => {
              throw new QuotaExhaustedError('gemini');
            },
          }),
          fakeLlm({ provider: 'groq', model: 'llama-test', isFallback: true }),
        ],
      }),
    );
    expect(r.verdict).toBe('likely_false');
    expect(r.confidence).toBe('medium');
    expect(r.toolRuns.find((t) => t.tool === 'llm_judge')?.model).toBe('llama-test');
  });

  it('reduced mode when every LLM is exhausted: unverified, full check queued', async () => {
    const r = await runFactCheck(textInput, deps({ quota: quota(['gemini', 'groq']) }));
    expect(r).toMatchObject({ verdict: 'unverified', mode: 'reduced', fullCheckStatus: 'queued' });
    expect(r.claims[0]?.claimText).toContain('RBI will ban 500 rupee notes');
    expect(r.toolRuns.find((t) => t.tool === 'claim_extraction')?.status).toBe('quota_exhausted');
  });

  it('screenshots: OCR text is checked; no text is an input error', async () => {
    const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg' };
    const ok = await runFactCheck({ ...textInput, inputType: 'image', text: null, image }, deps());
    expect(ok.toolRuns.find((t) => t.tool === 'ocr')?.status).toBe('ok');
    await expect(
      runFactCheck(
        { ...textInput, inputType: 'image', text: null, image },
        deps({ llms: [fakeLlm({ ocr: async () => '  ' })] }),
      ),
    ).rejects.toBeInstanceOf(FactCheckInputError);
  });

  it('guests lose live search at 80 % of the Gemini quota', async () => {
    const r = await runFactCheck({ ...textInput, isGuest: true }, deps({ quota: quota([], 0.85) }));
    const run = r.toolRuns.find((t) => t.tool === 'gemini_search');
    expect(run?.status).toBe('skipped');
    expect(r.verdict).toBe('unverified');
  });
});

describe('OCR availability', () => {
  it('retries later when no OCR provider can run (not "no text")', async () => {
    const image = { bytes: new Uint8Array([1]), mimeType: 'image/png' };
    await expect(
      runFactCheck(
        { ...textInput, inputType: 'image', text: null, image },
        deps({ quota: quota(['gemini']) }),
      ),
    ).rejects.toThrow('ocr_unavailable');
  });
});
