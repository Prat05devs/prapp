import type { FcConfidence, FcVerdict, SourceTier } from '../../../shared/src/constants.ts';
import type { Stance } from '../types.ts';

export interface ExtractedClaims {
  language: string; // ISO 639-1, e.g. "en", "hi"
  /** queries: keyword searches for news (English first, then the message's language) */
  claims: { text: string; isGovernmentRelated: boolean; queries?: string[] }[];
}

export interface Evidence {
  url: string;
  title: string | null;
  snippet: string | null;
  /** publisher's domain (used for the reliability tier) */
  domain: string;
  publisher?: string | null;
  publishedAt?: string | null;
  /** set by the pipeline before judging */
  tier?: SourceTier;
  isFactCheck?: boolean;
}

export interface Judgement {
  verdict: FcVerdict;
  confidence: FcConfidence;
  /** 2–3 sentences in the claim's language */
  explanation: string;
  stances: { url: string; stance: Stance }[];
}

export interface LLM {
  provider: string;
  model: string;
  /** true for fallbacks: confidence is lowered one level (LLD §11.3) */
  isFallback: boolean;
  extractClaims(text: string): Promise<ExtractedClaims>;
  judge(claim: string, evidence: Evidence[], language: string): Promise<Judgement>;
  ocr?(image: { bytes: Uint8Array; mimeType: string }): Promise<string>;
}

export interface WebSearch {
  provider: string;
  model: string | null;
  find(claim: string, language: string): Promise<Evidence[]>;
}

/**
 * A short-lived refusal (per-minute rate limit, "high demand", timeout). The router waits
 * retryAfterMs and tries the same model once more before falling back.
 */
export class TransientLlmError extends Error {
  constructor(
    readonly provider: string,
    readonly retryAfterMs: number,
    detail: string,
  ) {
    super(`transient_${provider}: ${detail}`);
    this.name = 'TransientLlmError';
  }
}

/** Seconds from a Retry-After header or a Google RetryInfo "12s" string, as ms. */
export function retryAfterMs(value: string | null | undefined, fallbackMs: number): number {
  const n = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.ceil(n * 1000) : fallbackMs;
}

export class QuotaExhaustedError extends Error {
  constructor(readonly provider: string) {
    super('quota_exhausted');
    this.name = 'QuotaExhaustedError';
  }
}
