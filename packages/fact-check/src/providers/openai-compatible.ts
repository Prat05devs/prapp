import { EXTRACT_PROMPT, JUDGE_PROMPT, toExtracted, toJudgement } from './prompts.ts';
import { QuotaExhaustedError, type LLM } from './types.ts';

// Groq and OpenRouter speak the OpenAI chat-completions API (free fallbacks, LLD §11.3).

export function openAiCompatibleLLM(opts: {
  provider: 'groq' | 'openrouter';
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}): LLM {
  const f = opts.fetchImpl ?? fetch;
  async function complete(prompt: string): Promise<string> {
    const res = await f(`${opts.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a careful fact-checking assistant. Reply with JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 || res.status === 402) throw new QuotaExhaustedError(opts.provider);
    if (!res.ok) throw new Error(`${opts.provider}_${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? '';
  }
  return {
    provider: opts.provider,
    model: opts.model,
    isFallback: true,
    extractClaims: async (text) => toExtracted(await complete(EXTRACT_PROMPT(text))),
    judge: async (claim, evidence, language) =>
      toJudgement(
        await complete(JUDGE_PROMPT(claim, evidence, language)),
        evidence.map((e) => e.url),
      ),
  };
}

export function cloudflareLLM(opts: {
  accountId: string;
  token: string;
  model: string;
  fetchImpl?: typeof fetch;
}): LLM {
  const f = opts.fetchImpl ?? fetch;
  async function complete(prompt: string): Promise<string> {
    const res = await f(
      `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/ai/run/${opts.model}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a careful fact-checking assistant. Reply with JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (res.status === 429) throw new QuotaExhaustedError('cloudflare');
    if (!res.ok) throw new Error(`cloudflare_${res.status}`);
    const json = (await res.json()) as { result?: { response?: string | object } };
    const r = json.result?.response;
    return typeof r === 'string' ? r : JSON.stringify(r ?? {});
  }
  return {
    provider: 'cloudflare',
    model: opts.model,
    isFallback: true,
    extractClaims: async (text) => toExtracted(await complete(EXTRACT_PROMPT(text))),
    judge: async (claim, evidence, language) =>
      toJudgement(
        await complete(JUDGE_PROMPT(claim, evidence, language)),
        evidence.map((e) => e.url),
      ),
  };
}
