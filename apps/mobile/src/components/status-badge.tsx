import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

type Tone = 'neutral' | 'verified' | 'danger' | 'warn' | 'ink';

// Same status colours as the web app.
const TONES: Record<OrderStatus, Tone> = {
  draft: 'neutral',
  pending_payment: 'warn',
  paid: 'verified',
  in_progress: 'verified',
  changes_requested: 'warn',
  published: 'ink',
  rejected: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
  expired: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <Badge variant={TONES[s] ?? 'neutral'}>
      <Text>{ORDER_STATUS_LABELS[s] ?? status}</Text>
    </Badge>
  );
}
