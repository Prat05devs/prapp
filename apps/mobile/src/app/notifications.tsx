import { router } from 'expo-router';
import { BellOff } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { PressableScale } from '@/components/motion/pressable-scale';
import { formatIST } from '@prapp/shared';
import { EmptyState, Text } from '@/components/ui';
import { useFocusedData } from '@/hooks/use-async';
import { openDeepLink } from '@/lib/links';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// In-app notification list (LLD §12). Tapping marks it read and opens its deep link.
export default function NotificationsScreen() {
  const list = useFocusedData(() => api.notifications.list());

  async function open(n: { id: string; read_at: string | null; data: unknown }) {
    if (!n.read_at) await api.notifications.markRead([n.id]).catch(() => {});
    await openDeepLink((n.data as { deep_link?: string } | null)?.deep_link, (href) =>
      router.push(href),
    );
    void list.refresh();
  }

  return (
    <FlatList
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-10"
      data={list.data ?? []}
      keyExtractor={(n) => n.id}
      refreshing={list.loading}
      onRefresh={() => void list.refresh()}
      ListEmptyComponent={
        list.loading ? null : (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            body="Updates about your orders and fact checks will show up here."
          />
        )
      }
      ItemSeparatorComponent={() => <View className="ml-9 h-px bg-divider" />}
      renderItem={({ item: n }) => (
        <PressableScale
          onPress={() => void open(n)}
          className="flex-row gap-3 px-4 py-4 active:bg-subtle"
        >
          <View
            className={cn('mt-2 h-2 w-2 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand')}
          />
          <View className="flex-1 gap-0.5">
            <Text
              className={cn(
                'font-sans-semibold text-label-md',
                n.read_at ? 'text-slate' : 'text-ink',
              )}
            >
              {n.title}
            </Text>
            <Text className="text-body-sm text-body">{n.body}</Text>
            <Text className="mt-1 text-body-sm text-slate">{formatIST(n.created_at)}</Text>
          </View>
        </PressableScale>
      )}
    />
  );
}
