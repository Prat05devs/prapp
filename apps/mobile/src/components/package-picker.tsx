import { View } from 'react-native';
import { PressableScale } from '@/components/motion/pressable-scale';
import type { CataloguePackage } from '@prapp/api-client';
import { formatMoney, offerChannelsSentence } from '@prapp/shared';
import { RadioGroup, RadioGroupItem, Text } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Package cards on a Reusables RadioGroup. */
export function PackagePicker({
  packages,
  value,
  onChange,
  disabled,
}: {
  packages: CataloguePackage[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <View className="gap-3">
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled} className="gap-3">
        {packages.map((p) => {
          const selected = value === p.id;
          return (
            <PressableScale
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              scaleTo={0.98}
              haptic={selected ? false : 'select'}
              onPress={() => onChange(p.id)}
              className={cn(
                'flex-row items-start gap-3.5 rounded-lg border p-4',
                selected
                  ? 'border-brand bg-brand-tint/40'
                  : 'border-hairline bg-paper active:bg-subtle',
                disabled && 'opacity-60',
              )}
            >
              <RadioGroupItem value={p.id} aria-labelledby={`package-${p.id}`} className="mt-0.5" />
              <View className="flex-1 gap-1">
                <View className="flex-row items-start justify-between gap-3">
                  <Text
                    nativeID={`package-${p.id}`}
                    className="font-sans-semibold text-[16px] text-ink"
                  >
                    {p.name}
                  </Text>
                  <Text className="font-sans-semibold text-[16px] tabular-nums text-ink">
                    {formatMoney(p.priceInrPaise)}
                  </Text>
                </View>
                <Text className="text-body-sm text-slate">
                  {`${offerChannelsSentence(p)}. Live within ${p.turnaroundHours} hours of payment, once approved.`}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </RadioGroup>
    </View>
  );
}
