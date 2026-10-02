import { QuotaExhaustedError, TransientLlmError, type LLM } from './providers/types.ts';

/** Daily-quota bookkeeping (backed by public.provider_usage in the worker). */
export interface QuotaStore {
  /** Atomically counts one call; false when today's quota is used up. */
  use(provider: string, model: string): Promise<boolean>;
  /** calls / daily_quota for today (0 when unknown). */
  usageRatio(provider: string, model: string): Promise<number>;
}

export class AllProvidersExhaustedError extends Error {
  constructor() {
    super('all_providers_exhausted');
    this.name = 'AllProvidersExhaustedError';
  }
}

/** Longest wait for a transient refusal before falling back to the next model. */
const MAX_RETRY_WAIT_MS = 12_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Picks the first LLM with quota (LLD §11.3: Gemini → Groq → Cloudflare → OpenRouter).
 * A transient refusal (rate limit per minute, overload, timeout) is retried once on the same
 * model after its suggested wait; anything else skips that model for the rest of this job.
 */
export class LlmRouter {
  private readonly skipped = new Set<string>();

  constructor(
    private readonly llms: LLM[],
    private readonly quota: QuotaStore,
  ) {}

  async run<T>(
    fn: (llm: LLM) => Promise<T>,
    filter: (llm: LLM) => boolean = () => true,
  ): Promise<{ value: T; llm: LLM }> {
    let lastError: unknown = null;
    for (const llm of this.llms) {
      const key = `${llm.provider}:${llm.model}`;
      if (this.skipped.has(key) || !filter(llm)) continue;
      if (!(await this.quota.use(llm.provider, llm.model))) {
        this.skipped.add(key);
        continue;
      }
      try {
        return { value: await fn(llm), llm };
      } catch (first) {
        let e = first;
        if (e instanceof TransientLlmError && e.retryAfterMs <= MAX_RETRY_WAIT_MS) {
          await sleep(e.retryAfterMs);
          try {
            return { value: await fn(llm), llm };
          } catch (second) {
            e = second;
          }
        }
        lastError = e;
        // Rate-limited models get another chance on the next call of this job.
        if (!(e instanceof TransientLlmError)) this.skipped.add(key);
        if (!(e instanceof QuotaExhaustedError))
          console.warn(`llm ${key} failed`, e instanceof Error ? e.message : e);
      }
    }
    if (lastError && !(lastError instanceof QuotaExhaustedError)) console.warn('all llms failed');
    throw new AllProvidersExhaustedError();
  }
}
