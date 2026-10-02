import type { Evidence, ExtractedClaims, Judgement } from './types.ts';

export const EXTRACT_PROMPT = (
  text: string,
) => `You extract checkable factual claims from a message people forward on WhatsApp in India.
Return JSON only:
{"language": "<ISO 639-1 code of the message, e.g. en, hi, mr, ta>",
 "claims": [{"text": "<claim, verbatim or minimally rephrased, in the original language>",
             "is_government_related": <true if about a government scheme, official notice, law, currency, ministry or public authority>,
             "queries": ["<news search query in English>", "<news search query in the message's language if it is not English>"]}]}
Rules:
- At most 3 claims, most important first. Only concrete, checkable statements (no opinions, greetings or calls to share). If nothing is checkable return "claims": [].
- Each query is 3-8 keywords a journalist would search: full names of people, places, organisations, schemes and numbers. No quotes, no "fake"/"true"/"viral" words.
- Keep names as Indian media spell them (e.g. "Narendra Modi", "Uttarakhand", "RBI").

MESSAGE:
"""${text.slice(0, 8000)}"""`;

function evidenceLine(e: Evidence, i: number): string {
  const meta = [
    e.publisher ?? e.domain,
    e.tier ? `reliability: ${e.tier}` : null,
    e.publishedAt ? `published ${e.publishedAt.slice(0, 10)}` : null,
    e.isFactCheck ? 'FACT-CHECK ARTICLE' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `[${i + 1}] ${e.url}\n${meta}\nHEADLINE: ${e.title ?? ''}\n${(e.snippet ?? '').slice(0, e.publisher === 'Wikipedia' ? 600 : 220)}`;
}

export const JUDGE_PROMPT = (
  claim: string,
  evidence: Evidence[],
  language: string,
  today: string = new Date().toISOString().slice(0, 10),
) => `You are a careful Indian fact-checker. Today's date is ${today}. Assess ONE claim using ONLY the evidence below.
Your own training data is out of date: never call something false or unverified just because you do not know about it. Recent events are real if the evidence reports them.
Reliability labels: tier1 = government / official fact-checker, tier2 = established news organisation, unknown = anything else.
Decide:
- "likely_true": tier1/tier2 sources report the claim's key facts (who, what, where, when, numbers) as having happened. Two or more independent tier1/tier2 publishers = "high" confidence; one = "medium".
- "likely_false": a fact-check article rates it false/fake, an official source denies it, or reliable reports clearly contradict a key fact.
- "misleading": partly true, exaggerated, missing context, wrong date/place, or old news/media presented as new (compare publication dates with today).
- "unverified": the evidence does not address the claim's key facts, or only unknown-reliability sources mention it.
Match the specifics: same people, place, numbers and timeframe. Reports about a different event do not confirm or refute this one.
- If the claim says an authority (government, RBI, NASA, WHO, UNESCO, a court...) confirmed, announced or declared something, and reliable sources or fact-checks show that authority made no such statement, choose "likely_false" ("misleading" if it twists something the authority really said).
- For a claimed major national event (a resignation, death, ban, new note, nationwide scheme), if reliable reports from that time clearly show the opposite (e.g. the person still in office), choose "likely_false". If the evidence is merely silent, choose "unverified".
- Wikipedia is background for settled facts; for recent events prefer news reports.
Return JSON only: {"verdict": "...", "confidence": "low|medium|high", "explanation": "<2-3 plain sentences in language '${language}' saying what the reliable sources report, naming them>", "stances": [{"source": <evidence number, e.g. 3>, "stance": "supports|refutes|context"}]}
Give a stance for every evidence item you relied on, by its number.

CLAIM: """${claim.slice(0, 1000)}"""

EVIDENCE:
${evidence.length ? evidence.map(evidenceLine).join('\n\n') : '(none)'}`;

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
    claims?: { text?: string; is_government_related?: boolean; queries?: unknown }[];
  }>(raw);
  return {
    language: (j.language ?? 'en').slice(0, 5).toLowerCase(),
    claims: (j.claims ?? [])
      .flatMap((c) =>
        typeof c.text === 'string' && c.text.trim().length > 3
          ? [
              {
                text: c.text.trim(),
                isGovernmentRelated: Boolean(c.is_government_related),
                queries: (Array.isArray(c.queries) ? c.queries : [])
                  .filter((q): q is string => typeof q === 'string' && q.trim().length > 2)
                  .map((q) => q.trim().slice(0, 150))
                  .slice(0, 2),
              },
            ]
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
    stances?: { source?: number | string; url?: string; stance?: string }[];
  }>(raw);
  const allowed = new Set(allowedUrls);
  // Sources are cited by their [n] number (long news URLs get mangled when copied);
  // a URL is still accepted when it matches exactly.
  const urlOf = (st: { source?: number | string; url?: string }): string | undefined => {
    const n =
      typeof st.source === 'string' ? Number.parseInt(st.source.replace(/\D/g, ''), 10) : st.source;
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= allowedUrls.length)
      return allowedUrls[n - 1];
    return st.url && allowed.has(st.url) ? st.url : undefined;
  };
  return {
    verdict: (VERDICTS as readonly string[]).includes(j.verdict ?? '')
      ? (j.verdict as Judgement['verdict'])
      : 'unverified',
    confidence: (CONFIDENCES as readonly string[]).includes(j.confidence ?? '')
      ? (j.confidence as Judgement['confidence'])
      : 'low',
    explanation: (j.explanation ?? '').trim().slice(0, 1200),
    // The LLM may only cite URLs we retrieved (LLD §11.2 step 5).
    stances: (j.stances ?? []).flatMap((st) => {
      const url = urlOf(st);
      return url && (st.stance === 'supports' || st.stance === 'refutes' || st.stance === 'context')
        ? [{ url, stance: st.stance }]
        : [];
    }),
  };
}
