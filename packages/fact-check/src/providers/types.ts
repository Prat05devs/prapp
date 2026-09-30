import type { FcConfidence, FcVerdict } from '../../../shared/src/constants.ts';
import type { Stance } from '../types.ts';

export interface ExtractedClaims {
  language: string; // ISO 639-1, e.g. "en", "hi"
  claims: { text: string; isGovernmentRelated: boolean }[];
}

export interface Evidence {
  url: string;
  title: string | null;
  snippet: string | null;
  domain: string;
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

export class QuotaExhaustedError extends Error {
  constructor(readonly provider: string) {
    super('quota_exhausted');
    this.name = 'QuotaExhaustedError';
  }
}
