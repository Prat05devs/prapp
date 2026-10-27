import { FC_VERDICT_DEFINITIONS, type FcVerdict } from '@prapp/shared';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { COLORS } from '@/lib/theme';

/** Same verdict colours as the web app (docs/DESIGN.md). */
export const VERDICT_COLORS: Record<FcVerdict, string> = {
  likely_false: COLORS.danger,
  misleading: COLORS.warn,
  likely_true: COLORS.verified,
  unverified: COLORS.slate,
};

/** Verdict panel backgrounds: the tint of each verdict colour. */
export const VERDICT_TINTS: Record<FcVerdict, string> = {
  likely_false: COLORS.dangerTint,
  misleading: COLORS.warnTint,
  likely_true: COLORS.verifiedTint,
  unverified: COLORS.neutralTint,
};

export const VERDICT_TONES: Record<FcVerdict, 'danger' | 'warn' | 'verified' | 'neutral'> = {
  likely_false: 'danger',
  misleading: 'warn',
  likely_true: 'verified',
  unverified: 'neutral',
};

export const VERDICT_ICONS: Record<FcVerdict, LucideIcon> = {
  likely_false: CircleAlert,
  misleading: TriangleAlert,
  likely_true: CircleCheck,
  unverified: Info,
};

/** What each verdict means, in the order we explain them (VERBAL_SYSTEM.md §10, shared copy). */
export const VERDICT_MEANINGS: [FcVerdict, string][] = (
  ['likely_false', 'misleading', 'likely_true', 'unverified'] as const
).map((v) => [v, FC_VERDICT_DEFINITIONS[v]]);
