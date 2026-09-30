import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import type { CataloguePackage } from '@prapp/api-client';
import { formatMoney } from '@prapp/shared';
import { Badge, Icon, RadioGroup, RadioGroupItem, Text } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Package cards on a Reusables RadioGroup (Stitch "distribution tier" cards). */
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
                'flex-row items-start gap-4 rounded-2xl border bg-canvas p-5',
                selected ? 'border-2 border-emerald-strong' : 'border-hairline active:border-ink',
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
                  {p.portalCount} news portal{p.portalCount === 1 ? '' : 's'}
                  {p.includesInstagram ? ' + our Instagram news page' : ''} · live within{' '}
                  {p.turnaroundHours} h
                </Text>
                {selected ? (
                  <Badge variant="emerald" className="mt-2 rounded-md">
                    <Icon as={Check} size={12} className="text-emerald-deep" />
                    <Text>Selected</Text>
                  </Badge>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </RadioGroup>
      <Text className="font-mono text-code text-slate">Prices are inclusive of all taxes</Text>
    </View>
  );
}
