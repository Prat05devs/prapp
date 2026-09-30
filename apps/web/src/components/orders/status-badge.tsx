import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Badge, type BadgeTone } from '@/components/ui';

const TONES: Record<OrderStatus, BadgeTone> = {
  draft: 'neutral',
  pending_payment: 'warn',
  paid: 'emerald',
  in_progress: 'emerald',
  changes_requested: 'warn',
  published: 'ink',
  rejected: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
  expired: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
  const tone = TONES[status as OrderStatus] ?? 'neutral';
  return (
    <Badge variant={tone}>
      {status === 'in_progress' || status === 'paid' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {label}
    </Badge>
  );
}
