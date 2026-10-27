import { router } from 'expo-router';
import { ChevronRight, Inbox, Plus, Receipt } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDateIST, formatMoney, type Currency } from '@prapp/shared';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StatusBadge } from '@/components/status-badge';
import {
  ActionButton,
  EmptyState,
  Group,
  HeaderButton,
  Icon,
  Notice,
  ScrollScreen,
  Text,
} from '@/components/ui';
import { useOrders } from '@/hooks/use-orders';
import { SIGN_IN_REASONS, promptSignIn } from '@/lib/sign-in-prompt';
import { useAuth } from '@/providers/auth-provider';

// Orders (wireframe in docs/MOBILE-UX.md): a grouped list, "+" in the bar for a new story.
export default function OrdersScreen() {
  const { session } = useAuth();
  const { data, loading, refresh, error } = useOrders();
  const orders = data ?? [];

  if (!session) {
    return (
      <ScrollScreen header={{ title: 'Orders' }}>
        <EmptyState icon={Receipt} title="Track your stories here" body={SIGN_IN_REASONS.orders}>
          <ActionButton
            title="Log in"
            variant="accent"
            onPress={() => promptSignIn({ mode: 'login', reason: 'orders' })}
          />
          <ActionButton
            title="Create an account"
            variant="outline"
            onPress={() => promptSignIn({ mode: 'signup', reason: 'orders' })}
          />
        </EmptyState>
        <Text className="px-1 text-center text-label-sm text-slate">
          You can write your story without an account. We&apos;ll ask you to log in when you save it
          to add images and pay.
        </Text>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      refreshing={loading}
      onRefresh={() => void refresh()}
      header={{
        title: 'Orders',
        right: (
          <HeaderButton icon={Plus} label="New story" onPress={() => router.navigate('/publish')} />
        ),
      }}
    >
      {error && !orders.length ? <Notice tone="danger">{error}</Notice> : null}
      {!loading && !orders.length && !error ? (
        <EmptyState
          icon={Inbox}
          title="No orders yet"
          body="Write your story, add 1–2 images and pay online. We publish approved stories and send you every live link."
        >
          <ActionButton
            title="Publish your story"
            variant="accent"
            onPress={() => router.navigate('/publish')}
          />
        </EmptyState>
      ) : null}
      {orders.length ? (
        <Group>
          {orders.map((o) => (
            <PressableScale
              scaleTo={0.985}
              key={o.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: o.id } })}
              className="flex-row items-center gap-3 px-4 py-3.5 active:bg-subtle"
            >
              <View className="flex-1 gap-1.5">
                <Text numberOfLines={2} className="font-sans-semibold text-[16px] text-ink">
                  {o.headline || 'Untitled story'}
                </Text>
                <View className="flex-row flex-wrap items-center gap-2">
                  <StatusBadge status={o.status} />
                  <Text className="text-label-sm tabular-nums text-slate">
                    <Text className="font-mono text-code text-slate">{o.orderNumber}</Text>
                    {` · ${formatDateIST(o.createdAt)}`}
                    {o.amountMinor
                      ? ` · ${formatMoney(o.amountMinor, (o.currency ?? 'INR') as Currency)}`
                      : ''}
                  </Text>
                </View>
              </View>
              <Icon as={ChevronRight} size={18} className="text-faint" />
            </PressableScale>
          ))}
        </Group>
      ) : null}
    </ScrollScreen>
  );
}
