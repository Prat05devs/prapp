import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Icon, Text } from '@/components/ui';

const PATH: OrderStatus[] = ['draft', 'pending_payment', 'paid', 'in_progress', 'published'];

/** Happy-path progress (same rules as the web timeline); hidden for off-path statuses. */
export function OrderTimeline({ status }: { status: string }) {
  const at = status === 'changes_requested' ? 3 : PATH.indexOf(status as OrderStatus);
  if (at < 0) return null;
  return (
    <View className="gap-2.5">
      {PATH.map((s, i) => {
        const done = i < at || (i === at && s === 'published');
        const current = i === at && s !== 'published';
        const label =
          current && status === 'changes_requested'
            ? ORDER_STATUS_LABELS.changes_requested
            : ORDER_STATUS_LABELS[s];
        return (
          <View key={s} className="flex-row items-center gap-3">
            <View
              className={`h-5 w-5 items-center justify-center rounded-full ${
                done
                  ? 'bg-emerald-strong'
                  : current
                    ? status === 'changes_requested'
                      ? 'bg-warn'
                      : 'bg-ink'
                    : 'border border-hairline bg-canvas'
              }`}
            >
              {done ? <Icon as={Check} size={11} className="text-white" /> : null}
              {current ? <View className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </View>
            <Text
              className={`text-label-md ${done || current ? 'font-sans-medium text-ink' : 'text-faint'}`}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
