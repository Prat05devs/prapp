import type { z } from 'zod';

export type OrderFieldErrors = Partial<
  Record<'packageId' | 'headline' | 'body' | 'instagramHandle' | 'declarationAccepted', string>
>;

/** First message per top-level field. */
export function fieldErrorsFrom<K extends string>(error: z.ZodError): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as K | undefined;
    if (key !== undefined && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}
