import { router } from 'expo-router';
import { ArrowRight, ChevronRight, Inbox, Pencil } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatDateIST, formatMoney, type Currency } from '@prapp/shared';
import { StatusBadge } from '@/components/status-badge';
import { ActionButton, Icon, PageHeader, TabScreen, Text } from '@/components/ui';
import { useOrders } from '@/hooks/use-orders';
import { SIGN_IN_REASONS, promptSignIn } from '@/lib/sign-in-prompt';
import { useAuth } from '@/providers/auth-provider';

export default function OrdersScreen() {
  const { session } = useAuth();
  const { data, loading, refresh, error } = useOrders();
  const orders = data ?? [];

  if (!session) {
    return (
      <TabScreen>
        <PageHeader title="Your orders" lede={SIGN_IN_REASONS.orders} />
        <View className="gap-3">
          <ActionButton
            title="Log in"
            variant="accent"
            icon={ArrowRight}
            onPress={() => promptSignIn({ mode: 'login', reason: 'orders' })}
          />
          <ActionButton
            title="Create an account"
            variant="outline"
            onPress={() => promptSignIn({ mode: 'signup', reason: 'orders' })}
          />
        </View>
        <Text variant="muted">
          You can write your story without an account. We&apos;ll ask you to log in when you save it
          to add photos and pay.
        </Text>
        <ActionButton
          title="Publish your story"
          variant="ghost"
          icon={Pencil}
          onPress={() => router.push('/publish')}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen refreshing={loading} onRefresh={() => void refresh()}>
      <PageHeader
        eyebrow={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        title="Your orders"
      />
      {!loading && !orders.length ? (
        <View className="items-center gap-4 rounded-xl border border-dashed border-input bg-paper px-6 py-12">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-subtle">
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
              className="gap-2 rounded-lg border border-hairline bg-paper p-4 active:border-ink"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-mono text-code text-slate">{o.orderNumber}</Text>
                <StatusBadge status={o.status} />
              </View>
              <Text variant="label">{o.headline || 'Untitled story'}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-body-sm text-slate">
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
