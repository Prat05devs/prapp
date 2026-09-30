import { View } from 'react-native';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

type Tone = 'neutral' | 'emerald' | 'danger' | 'warn' | 'ink';

// Same status colours as the web app.
const TONES: Record<OrderStatus, Tone> = {
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
  const s = status as OrderStatus;
  return (
    <Badge variant={TONES[s] ?? 'neutral'}>
      {s === 'paid' || s === 'in_progress' ? (
        <View className="h-1.5 w-1.5 rounded-full bg-emerald-deep" />
      ) : null}
      <Text>{ORDER_STATUS_LABELS[s] ?? status}</Text>
    </Badge>
  );
}
