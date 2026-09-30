import type { FcVerdict } from '@prapp/shared';
import type { IconName } from '@/components/icon';
import type { BadgeTone } from '@/components/ui';

/** Solid verdict colours (share image, verdict chip). Match the design-system semantic tokens. */
export const VERDICT_COLORS: Record<FcVerdict, string> = {
  likely_false: '#ba1a1a',
  misleading: '#b45309',
  likely_true: '#006c49',
  unverified: '#71717a',
};

export const VERDICT_TONES: Record<FcVerdict, BadgeTone> = {
  likely_false: 'danger',
  misleading: 'warn',
  likely_true: 'emerald',
  unverified: 'neutral',
};

export const VERDICT_ICONS: Record<FcVerdict, IconName> = {
  likely_false: 'error',
  misleading: 'warning',
  likely_true: 'check_circle',
  unverified: 'info',
};
