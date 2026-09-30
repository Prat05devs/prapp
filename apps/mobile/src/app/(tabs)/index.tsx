import { router } from 'expo-router';
import { ArrowRight, Check, ChevronRight, SearchCheck, ShieldCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatMoney } from '@prapp/shared';
import { StatusBadge } from '@/components/status-badge';
import { ActionButton, Eyebrow, Icon, LivePill, Panel, TabScreen, Text } from '@/components/ui';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/providers/auth-provider';

const ACTIVE = ['pending_payment', 'paid', 'in_progress', 'changes_requested'];

// Home (LLD §13): fact-check card · active order (status only) · publish banner with portal names.
export default function HomeScreen() {
  const { me } = useAuth();
  const orders = useOrders();
  const catalogue = useCatalogue();
  const active = orders.data?.find((o) => ACTIVE.includes(o.status));
  const cheapest = catalogue.data?.packages.reduce<number | null>(
    (m, p) => (m === null || p.priceInrPaise < m ? p.priceInrPaise : m),
    null,
  );

  return (
    <TabScreen
      refreshing={orders.loading}
      onRefresh={() => void Promise.all([orders.refresh(), catalogue.refresh()])}
    >
      <View className="gap-2">
        <Eyebrow>Hi {me?.fullName?.split(' ')[0]}</Eyebrow>
        <Text variant="h1">
          Got a forward? <Text className="text-emerald-strong">Check it first.</Text>
        </Text>
      </View>

      <Panel tone="subtle" className="gap-4">
        <LivePill>Free · every answer shows its sources</LivePill>
        <Text variant="p">
          Check a message, link or screenshot before you share it. We tell you which tools we used.
        </Text>
        <ActionButton
          title="Check a forward"
          variant="accent"
          icon={ArrowRight}
          onPress={() => router.push('/fact-check')}
        />
        <View className="flex-row items-center gap-2">
          <Icon as={ShieldCheck} size={14} className="text-emerald-strong" />
          <Text className="font-mono text-code text-slate">
            Likely false · Misleading · Likely true · Unverified
          </Text>
        </View>
      </Panel>

      {active ? (
        <View className="gap-3">
          <Eyebrow>Your active order</Eyebrow>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/orders/[id]', params: { id: active.id } })}
            className="gap-3 rounded-2xl border border-hairline bg-canvas p-5 active:border-ink"
          >
            <View className="flex-row items-center justify-between">
              <View className="rounded-md bg-elevated px-2 py-0.5">
                <Text className="font-mono text-code text-ink">{active.orderNumber}</Text>
              </View>
              <StatusBadge status={active.status} />
            </View>
            <Text variant="label">{active.headline}</Text>
            <View className="flex-row items-center justify-end">
              <Icon as={ChevronRight} size={16} className="text-faint" />
            </View>
          </Pressable>
        </View>
      ) : null}

      <View className="gap-4 rounded-3xl bg-ink p-6">
        <View className="flex-row items-center gap-2 self-start rounded-full border border-white/15 px-3 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-emerald" />
          <Text className="font-mono text-label-sm uppercase text-emerald-soft">
            Live within 24 hours
          </Text>
        </View>
        <Text className="font-display text-headline-lg-mobile text-white">Publish your story</Text>
        <Text className="text-body-md text-white/70">
          On our news portals and Instagram news page within 24 hours
          {cheapest ? `, from ${formatMoney(cheapest)} (all taxes included)` : ''}. Published as
          sponsored content.
        </Text>
        {catalogue.data?.portals.length ? (
          <View className="flex-row flex-wrap gap-2">
            {catalogue.data.portals.map((p) => (
              <View
                key={p.name}
                className="flex-row items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1"
              >
                <Icon as={Check} size={12} className="text-emerald-soft" />
                <Text className="font-mono text-code text-white">{p.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <ActionButton
          title="Publish your story"
          variant="accent"
          icon={ArrowRight}
          onPress={() => router.push('/publish')}
        />
      </View>

      <View className="flex-row items-center gap-2 self-center">
        <Icon as={SearchCheck} size={12} className="text-faint" />
        <Text className="font-mono text-[11px] uppercase text-faint">
          Checked against public sources
        </Text>
      </View>
    </TabScreen>
  );
}
