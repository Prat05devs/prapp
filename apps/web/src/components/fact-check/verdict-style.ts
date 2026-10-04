import type { FcVerdict } from '@prapp/shared';
import type { IconName } from '@/components/icon';
import type { BadgeTone } from '@/components/ui';

/** Verdict text colours. Match the semantic tokens in globals.css (docs/DESIGN.md). */
export const VERDICT_COLORS: Record<FcVerdict, string> = {
  likely_false: '#b3261e',
  misleading: '#8a5300',
  likely_true: '#1e6b45',
  unverified: '#6b655b',
};

/** Verdict panel backgrounds: the tint of each verdict colour. */
export const VERDICT_TINTS: Record<FcVerdict, string> = {
  likely_false: '#f7e2df',
  misleading: '#f6ead2',
  likely_true: '#e5f0e9',
  unverified: '#f1eee7',
};

export const VERDICT_TONES: Record<FcVerdict, BadgeTone> = {
  likely_false: 'danger',
  misleading: 'warn',
  likely_true: 'verified',
  unverified: 'neutral',
};

export const VERDICT_ICONS: Record<FcVerdict, IconName> = {
  likely_false: 'error',
  misleading: 'warning',
  likely_true: 'check_circle',
  unverified: 'info',
};

/** What each verdict means, in the order we explain them (methodology, home page). */
export const VERDICT_MEANINGS: [FcVerdict, string][] = [
  ['likely_false', 'Reliable sources contradict the claim.'],
  ['misleading', 'Partly true, missing context, or old media presented as new.'],
  ['likely_true', 'Reliable sources confirm the claim.'],
  ['unverified', 'We did not find enough reliable evidence either way.'],
];
