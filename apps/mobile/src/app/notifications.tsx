import { router } from 'expo-router';
import { BellOff } from 'lucide-react-native';
import { FlatList, Pressable, View } from 'react-native';
import { formatIST } from '@prapp/shared';
import { Icon, Text } from '@/components/ui';
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
      data={list.data ?? []}
      keyExtractor={(n) => n.id}
      refreshing={list.loading}
      onRefresh={() => void list.refresh()}
      ListEmptyComponent={
        <View className="m-5 items-center gap-3 rounded-2xl border border-dashed border-hairline bg-subtle px-6 py-12">
          <Icon as={BellOff} size={20} className="text-slate" />
          <Text variant="muted">Nothing yet.</Text>
        </View>
      }
      ItemSeparatorComponent={() => <View className="mx-5 h-px bg-divider" />}
      renderItem={({ item: n }) => (
        <Pressable
          onPress={() => void open(n)}
          className="flex-row gap-3 px-5 py-4 active:bg-subtle"
        >
          <View
            className={cn(
              'mt-2 h-1.5 w-1.5 rounded-full',
              n.read_at ? 'bg-transparent' : 'bg-emerald',
            )}
          />
          <View className="flex-1 gap-0.5">
            <Text
              className={cn(
                'font-sans-medium text-label-md',
                n.read_at ? 'text-slate' : 'text-ink',
              )}
            >
              {n.title}
            </Text>
            <Text className="text-body-sm text-body">{n.body}</Text>
            <Text className="mt-1 font-mono text-code text-faint">{formatIST(n.created_at)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
