import { View } from 'react-native';
import { GrowBar } from '@/components/motion/grow-bar';
import { Text } from '@/components/ui';
import { COLORS } from '@/lib/theme';

const STEPS = ['Write your story', 'Add images', 'Review and pay'];

/** Where the customer is in the publish flow (same steps as the web app): "Step 1 of 3" once. */
export function PublishSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <View className="gap-2" accessibilityLabel={`Step ${current} of 3: ${STEPS[current - 1]}`}>
      <Text className="text-label-sm text-slate">
        Step {current} of 3 ·{' '}
        <Text className="font-sans-semibold text-label-sm text-ink">{STEPS[current - 1]}</Text>
      </Text>
      <View className="flex-row gap-1.5">
        {STEPS.map((label, i) => (
          <View key={label} className="flex-1">
            {/* finished steps fill in one after another */}
            <GrowBar
              value={i < current ? 1 : 0}
              delay={i * 180}
              color={COLORS.brand}
              className="h-1"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
