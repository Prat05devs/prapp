import type { FcVerdict } from '@prapp/shared';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

/** Same verdict colours as the web app and the share image. */
export const VERDICT_COLORS: Record<FcVerdict, string> = {
  likely_false: '#ba1a1a',
  misleading: '#b45309',
  likely_true: '#006c49',
  unverified: '#71717a',
};

export const VERDICT_TONES: Record<FcVerdict, 'danger' | 'warn' | 'emerald' | 'neutral'> = {
  likely_false: 'danger',
  misleading: 'warn',
  likely_true: 'emerald',
  unverified: 'neutral',
};

export const VERDICT_ICONS: Record<FcVerdict, LucideIcon> = {
  likely_false: CircleAlert,
  misleading: TriangleAlert,
  likely_true: CircleCheck,
  unverified: Info,
};
