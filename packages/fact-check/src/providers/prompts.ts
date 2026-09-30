import type { Evidence, ExtractedClaims, Judgement } from './types.ts';

export const EXTRACT_PROMPT = (
  text: string,
) => `You extract checkable factual claims from a message people forward on WhatsApp in India.
Return JSON only: {"language": "<ISO 639-1 code of the message>", "claims": [{"text": "<claim, verbatim or minimally rephrased, in the original language>", "is_government_related": <true if it is about a government scheme, official notice, law, currency, ministry or public authority>}]}
Rules: at most 3 claims, most important first. Only concrete, checkable statements (no opinions, greetings or calls to share). If nothing is checkable return "claims": [].

MESSAGE:
"""${text.slice(0, 8000)}"""`;

export const JUDGE_PROMPT = (
  claim: string,
  evidence: Evidence[],
  language: string,
) => `You assess one claim using ONLY the evidence below. Do not use outside knowledge. Do not invent sources.
Verdicts: "likely_false" (evidence contradicts it), "misleading" (partly true / missing context / old or unrelated media), "likely_true" (evidence confirms it), "unverified" (evidence is missing, weak or unrelated).
Confidence: "high" only if several independent reliable sources agree; "low" if evidence is thin.
Return JSON only: {"verdict": "...", "confidence": "low|medium|high", "explanation": "<2–3 plain sentences in language '${language}' explaining what the evidence shows>", "stances": [{"url": "<one of the evidence URLs>", "stance": "supports|refutes|context"}]}

CLAIM: """${claim.slice(0, 1000)}"""

EVIDENCE:
${evidence.length ? evidence.map((e, i) => `[${i + 1}] ${e.url}\n${e.title ?? ''}\n${(e.snippet ?? '').slice(0, 600)}`).join('\n\n') : '(none)'}`;

export const OCR_PROMPT =
  'Transcribe all readable text in this image exactly as written (any language, keep line breaks). If there is no readable text, return an empty string. Return only the text.';

/** Models sometimes wrap JSON in ```json fences or add prose; take the first JSON object. */
export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('llm_bad_json');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

const VERDICTS = ['likely_false', 'misleading', 'likely_true', 'unverified'] as const;
const CONFIDENCES = ['low', 'medium', 'high'] as const;

export function toExtracted(raw: string): ExtractedClaims {
  const j = parseJsonLoose<{
    language?: string;
    claims?: { text?: string; is_government_related?: boolean }[];
  }>(raw);
  return {
    language: (j.language ?? 'en').slice(0, 5).toLowerCase(),
    claims: (j.claims ?? [])
      .flatMap((c) =>
        typeof c.text === 'string' && c.text.trim().length > 3
          ? [{ text: c.text.trim(), isGovernmentRelated: Boolean(c.is_government_related) }]
          : [],
      )
      .slice(0, 3),
  };
}

export function toJudgement(raw: string, allowedUrls: string[]): Judgement {
  const j = parseJsonLoose<{
    verdict?: string;
    confidence?: string;
    explanation?: string;
    stances?: { url?: string; stance?: string }[];
  }>(raw);
  const allowed = new Set(allowedUrls);
  return {
    verdict: (VERDICTS as readonly string[]).includes(j.verdict ?? '')
      ? (j.verdict as Judgement['verdict'])
      : 'unverified',
    confidence: (CONFIDENCES as readonly string[]).includes(j.confidence ?? '')
      ? (j.confidence as Judgement['confidence'])
      : 'low',
    explanation: (j.explanation ?? '').trim().slice(0, 1200),
    // The LLM may only cite URLs we retrieved (LLD §11.2 step 5).
    stances: (j.stances ?? []).flatMap((st) =>
      st.url &&
      allowed.has(st.url) &&
      (st.stance === 'supports' || st.stance === 'refutes' || st.stance === 'context')
        ? [{ url: st.url, stance: st.stance }]
        : [],
    ),
  };
}
