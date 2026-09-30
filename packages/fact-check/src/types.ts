import type {
  FcConfidence,
  FcInputType,
  FcMode,
  FcVerdict,
  SourceTier,
} from '../../shared/src/constants.ts';

export type Stance = 'supports' | 'refutes' | 'context';
export type ToolStatus = 'ok' | 'skipped' | 'failed' | 'quota_exhausted';

/** Tools named in the "How we checked this" section (fact_check_tool_runs.tool). */
export type ToolName =
  | 'fetch_url'
  | 'rdap'
  | 'ocr'
  | 'google_fact_check'
  | 'google_fact_check_image'
  | 'claim_matching'
  | 'claim_extraction'
  | 'gemini_search'
  | 'searxng'
  | 'gdelt'
  | 'wikipedia'
  | 'llm_judge';

export interface FactCheckInput {
  id: string;
  inputType: FcInputType;
  text: string | null;
  url: string | null;
  image: { bytes: Uint8Array; mimeType: string } | null;
  /** guests get checks without live web search when Gemini is at 80 % (LLD §11.3) */
  isGuest: boolean;
}

export interface SourceOut {
  url: string;
  domain: string;
  title: string | null;
  publisher: string | null;
  tier: SourceTier;
  stance: Stance | null;
  isExistingFactCheck: boolean;
  rating: string | null;
  publishedAt: string | null;
}

export interface ClaimOut {
  position: number;
  claimText: string;
  verdict: FcVerdict;
  explanation: string | null;
  isGovernmentRelated: boolean;
  sources: SourceOut[];
}

export interface ToolRun {
  tool: ToolName;
  model: string | null;
  status: ToolStatus;
  startedAt: string;
  finishedAt: string;
  summary: string | null;
}

export interface PipelineResult {
  language: string | null;
  summary: string;
  verdict: FcVerdict;
  confidence: FcConfidence;
  mode: FcMode;
  fullCheckStatus: 'not_needed' | 'queued' | 'done';
  inputDomain: string | null;
  inputDomainTier: SourceTier | null;
  inputDomainAgeDays: number | null;
  claims: ClaimOut[];
  toolRuns: ToolRun[];
}

/** Thrown for inputs we cannot check (the job ends as failed with this code). */
export class FactCheckInputError extends Error {
  constructor(readonly code: 'no_text_in_image' | 'url_unreachable' | 'no_claims') {
    super(code);
    this.name = 'FactCheckInputError';
  }
}
