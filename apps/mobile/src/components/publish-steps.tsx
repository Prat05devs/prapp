import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';

const STEPS = ['Write', 'Add photos', 'Review & pay'];

/** Where the customer is in the publish flow (same steps as the web app). */
export function PublishSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <View className="flex-row items-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <View key={label} className="flex-row items-center gap-2">
            <View
              className={`h-6 w-6 items-center justify-center rounded-full ${
                done ? 'bg-emerald-strong' : active ? 'bg-ink' : 'border border-hairline'
              }`}
            >
              {done ? (
                <Icon as={Check} size={12} className="text-white" />
              ) : (
                <Text className={`font-mono text-[11px] ${active ? 'text-white' : 'text-faint'}`}>
                  {String(n).padStart(2, '0')}
                </Text>
              )}
            </View>
            <Text className={`text-label-sm ${active ? 'text-ink' : 'text-slate'}`}>{label}</Text>
            {n < STEPS.length ? <View className="h-px w-3 bg-hairline" /> : null}
          </View>
        );
      })}
    </View>
  );
}
