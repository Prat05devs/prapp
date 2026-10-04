import { Pressable, View } from 'react-native';
import type { CataloguePackage } from '@prapp/api-client';
import { formatMoney } from '@prapp/shared';
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
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(p.id)}
              className={cn(
                'flex-row items-start gap-4 rounded-lg border p-5',
                selected
                  ? 'border-brand bg-brand-tint/40'
                  : 'border-hairline bg-paper active:border-ink',
                disabled && 'opacity-60',
              )}
            >
              <RadioGroupItem value={p.id} aria-labelledby={`package-${p.id}`} className="mt-0.5" />
              <View className="flex-1 gap-1">
                <View className="flex-row items-start justify-between gap-3">
                  <Text nativeID={`package-${p.id}`} variant="label">
                    {p.name}
                  </Text>
                  <Text className="font-display text-headline-sm text-ink">
                    {formatMoney(p.priceInrPaise)}
                  </Text>
                </View>
                <Text variant="muted">
                  {p.portalCount} high-DA news portal{p.portalCount === 1 ? '' : 's'}
                  {p.includesInstagram ? ' + 1 Instagram collaboration post' : ''} · live within{' '}
                  {p.turnaroundHours} h
                </Text>
              </View>
            </Pressable>
          );
        })}
      </RadioGroup>
      <Text variant="muted">Prices include all taxes.</Text>
    </View>
  );
}
