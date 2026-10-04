import { Check, ChevronDown, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { phoneCountries } from '@prapp/shared';
import { Icon, Text } from '@/components/ui';

/** Country calling-code picker, +91 first (LLD §6.2). */
export function CountryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const countries = useMemo(() => phoneCountries(), []);
  const selected = countries.find((c) => c.code === value);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Country code"
        onPress={() => setOpen(true)}
        className="h-11 flex-row items-center gap-1.5 rounded-lg border border-hairline bg-background px-3 active:border-ink"
      >
        <Text className="font-mono text-code text-ink">
          {value} +{selected?.callingCode}
        </Text>
        <Icon as={ChevronDown} size={14} className="text-slate" />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-canvas">
          <View className="flex-row items-center justify-between border-b border-rule px-5 py-4">
            <Text variant="h3">Country code</Text>
            <Pressable
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={() => setOpen(false)}
              className="h-9 w-9 items-center justify-center rounded-full border border-hairline"
            >
              <Icon as={X} size={16} className="text-ink" />
            </Pressable>
          </View>
          <FlatList
            data={countries}
            keyExtractor={(c) => c.code}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ItemSeparatorComponent={() => <View className="mx-5 h-px bg-divider" />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
                className="flex-row items-center justify-between px-5 py-3.5 active:bg-subtle"
              >
                <Text className="font-mono text-code text-ink">
                  {item.code} +{item.callingCode}
                </Text>
                {item.code === value ? <Icon as={Check} size={16} className="text-brand" /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
