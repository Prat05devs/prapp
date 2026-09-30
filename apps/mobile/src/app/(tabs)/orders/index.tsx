import { router } from 'expo-router';
import { ArrowRight, ChevronRight, Inbox, Pencil } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatDateIST, formatMoney, type Currency } from '@prapp/shared';
import { StatusBadge } from '@/components/status-badge';
import { ActionButton, Icon, PageHeader, TabScreen, Text } from '@/components/ui';
import { useOrders } from '@/hooks/use-orders';

export default function OrdersScreen() {
  const { data, loading, refresh, error } = useOrders();
  const orders = data ?? [];

  return (
    <TabScreen refreshing={loading} onRefresh={() => void refresh()}>
      <PageHeader
        eyebrow={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        title="Your orders"
      />
      {!loading && !orders.length ? (
        <View className="items-center gap-4 rounded-2xl border border-dashed border-hairline bg-subtle px-6 py-12">
          <View className="h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas">
            <Icon as={Inbox} size={20} className="text-slate" />
          </View>
          <View className="items-center gap-1">
            <Text variant="label">{error ?? 'No orders yet'}</Text>
            <Text variant="muted" className="text-center">
              Publish your story on our news portals within 24 hours.
            </Text>
          </View>
          <ActionButton
            title="Publish your story"
            variant="accent"
            icon={ArrowRight}
            onPress={() => router.push('/publish')}
          />
        </View>
      ) : (
        <View className="gap-3">
          {orders.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: o.id } })}
              className="gap-3 rounded-2xl border border-hairline bg-canvas p-5 active:border-ink"
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="rounded-md bg-elevated px-2 py-0.5">
                  <Text className="font-mono text-code text-ink">{o.orderNumber}</Text>
                </View>
                <StatusBadge status={o.status} />
              </View>
              <Text variant="label">{o.headline || 'Untitled story'}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-code text-slate">
                  {formatDateIST(o.createdAt)}
                  {o.amountMinor
                    ? ` · ${formatMoney(o.amountMinor, (o.currency ?? 'INR') as Currency)}`
                    : ''}
                </Text>
                <Icon as={ChevronRight} size={16} className="text-faint" />
              </View>
            </Pressable>
          ))}
          <ActionButton
            title="New story"
            variant="outline"
            icon={Pencil}
            onPress={() => router.push('/publish')}
          />
        </View>
      )}
    </TabScreen>
  );
}
