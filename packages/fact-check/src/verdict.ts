import type { FcConfidence, FcVerdict } from '../../shared/src/constants.ts';

/** Maps an existing fact check's textual rating (LLD §11.2 step 6). */
export function verdictFromRating(rating: string | null | undefined): FcVerdict | null {
  const r = (rating ?? '').toLowerCase();
  if (!r) return null;
  if (
    /(partly|partially|half|mostly false|misleading|missing context|out of context|exaggerat|distorted|mixture|mixed|satire)/.test(
      r,
    )
  ) {
    return 'misleading';
  }
  if (
    /(false|fake|incorrect|wrong|hoax|fabricated|scam|pants on fire|not true|baseless|doctored|morphed|edited|galat|jhooth|फर्जी|झूठ|गलत)/.test(
      r,
    )
  ) {
    return 'likely_false';
  }
  if (/(^true$|^correct|accurate|mostly true|^real$|genuine|^sach|सच)/.test(r))
    return 'likely_true';
  return null;
}

const SEVERITY: Record<FcVerdict, number> = {
  likely_false: 3,
  misleading: 2,
  unverified: 1,
  likely_true: 0,
};

/** Overall verdict = worst claim. */
export function overallVerdict(verdicts: FcVerdict[]): FcVerdict {
  if (!verdicts.length) return 'unverified';
  return verdicts.reduce((worst, v) => (SEVERITY[v] > SEVERITY[worst] ? v : worst));
}

const ORDER: FcConfidence[] = ['low', 'medium', 'high'];

/** A fallback (non-Gemini) model lowers confidence one level (LLD §11.3). */
export function lowerConfidence(c: FcConfidence): FcConfidence {
  return ORDER[Math.max(0, ORDER.indexOf(c) - 1)] ?? 'low';
}

export function minConfidence(list: FcConfidence[]): FcConfidence {
  if (!list.length) return 'low';
  return list.reduce((a, b) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b));
}
