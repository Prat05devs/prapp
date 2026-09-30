import { EXTRACT_PROMPT, JUDGE_PROMPT, OCR_PROMPT, toExtracted, toJudgement } from './prompts.ts';
import { QuotaExhaustedError, type Evidence, type LLM, type WebSearch } from './types.ts';

// Gemini API (free tier) over REST, so it runs in Deno and Node alike.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: {
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
      groundingSupports?: { segment?: { text?: string }; groundingChunkIndices?: number[] }[];
    };
  }[];
}

async function generate(
  apiKey: string,
  model: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<GeminiResponse> {
  const res = await fetchImpl(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429) throw new QuotaExhaustedError('gemini');
  if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as GeminiResponse;
}

const textOf = (r: GeminiResponse) =>
  r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function geminiLLM(opts: {
  apiKey: string;
  model: string;
  ocrModel: string;
  fetchImpl?: typeof fetch;
}): LLM {
  const f = opts.fetchImpl ?? fetch;
  const json = (prompt: string) =>
    generate(
      opts.apiKey,
      opts.model,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      },
      f,
    ).then(textOf);
  return {
    provider: 'gemini',
    model: opts.model,
    isFallback: false,
    extractClaims: async (text) => toExtracted(await json(EXTRACT_PROMPT(text))),
    judge: async (claim, evidence, language) =>
      toJudgement(
        await json(JUDGE_PROMPT(claim, evidence, language)),
        evidence.map((e) => e.url),
      ),
    ocr: async (image) =>
      textOf(
        await generate(
          opts.apiKey,
          opts.ocrModel,
          {
            contents: [
              {
                role: 'user',
                parts: [
                  { inline_data: { mime_type: image.mimeType, data: base64(image.bytes) } },
                  { text: OCR_PROMPT },
                ],
              },
            ],
            generationConfig: { temperature: 0 },
          },
          f,
        ),
      ).trim(),
  };
}

/**
 * Gemini + Google Search grounding: only the cited URLs are kept (LLD §11.2 step 4).
 * Grounding URIs are redirect links; we resolve them to the real article URL.
 */
export function geminiSearch(opts: {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}): WebSearch {
  const f = opts.fetchImpl ?? fetch;
  return {
    provider: 'gemini_search',
    model: opts.model,
    async find(claim, language) {
      const r = await generate(
        opts.apiKey,
        opts.model,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Search the web for reliable reporting (news, government, fact-checkers) about this claim and summarise what the sources say. Language of the claim: ${language}.\nCLAIM: """${claim.slice(0, 1000)}"""`,
                },
              ],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1 },
        },
        f,
      );
      const meta = r.candidates?.[0]?.groundingMetadata;
      const chunks = meta?.groundingChunks ?? [];
      const snippets = new Map<number, string>();
      for (const s of meta?.groundingSupports ?? []) {
        for (const i of s.groundingChunkIndices ?? []) {
          snippets.set(i, `${snippets.get(i) ?? ''} ${s.segment?.text ?? ''}`.trim());
        }
      }
      const out: Evidence[] = [];
      for (const [i, c] of chunks.entries()) {
        if (!c.web?.uri) continue;
        const url = await resolveRedirect(c.web.uri, f);
        if (!url) continue;
        out.push({
          url,
          title: c.web.title ?? null,
          snippet: snippets.get(i) ?? null,
          domain: new URL(url).hostname.replace(/^www\./, ''),
        });
      }
      return out;
    },
  };
}

async function resolveRedirect(uri: string, f: typeof fetch): Promise<string | null> {
  if (!/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/.test(uri)) return uri;
  try {
    const res = await f(uri, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(6000),
    });
    return res.headers.get('location');
  } catch {
    return null;
  }
}
