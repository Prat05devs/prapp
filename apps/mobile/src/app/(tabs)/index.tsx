import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, ClipboardPaste } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FC_VERDICT_LABELS, formatMoney, publicAssetUrl, type OrderStatus } from '@prapp/shared';
import { PortalWall } from '@/components/portal-wall';
import { SourceStrip } from '@/components/source-strip';
import { StatusBadge } from '@/components/status-badge';
import {
  ActionButton,
  Button,
  Eyebrow,
  Icon,
  Panel,
  StepHeading,
  TabScreen,
  Text,
  Textarea,
} from '@/components/ui';
import {
  VERDICT_COLORS,
  VERDICT_ICONS,
  VERDICT_MEANINGS,
  VERDICT_TINTS,
} from '@/components/verdict-style';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useOrders } from '@/hooks/use-orders';
import { appEnv } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

const ACTIVE = ['pending_payment', 'paid', 'in_progress', 'changes_requested'];
/** The customer's happy path, for the active-order progress bar (same as OrderTimeline). */
const PATH: OrderStatus[] = ['draft', 'pending_payment', 'paid', 'in_progress', 'published'];

/**
 * Home (LLD §13). Order of the page: check a forward right here · your active order · how to
 * read a verdict · publish your story · recently published · our network · where we look.
 * Every number and name on it comes from the catalogue or the user's own orders (docs/DESIGN.md:
 * real content only).
 */
export default function HomeScreen() {
  const { me } = useAuth();
  const orders = useOrders();
  const catalogue = useCatalogue();
  const [text, setText] = useState('');
  const active = orders.data?.find((o) => ACTIVE.includes(o.status));
  const pkg = catalogue.data?.packages[0];
  const showcase = catalogue.data?.showcase ?? [];
  const portals = catalogue.data?.portals ?? [];
  const firstName = me?.fullName?.split(' ')[0];
  const supabaseUrl = appEnv().EXPO_PUBLIC_SUPABASE_URL;

  function check() {
    const forward = text.trim();
    if (!forward) return router.push('/fact-check');
    router.push({ pathname: '/fact-check', params: { text: forward } });
    setText('');
  }

  async function paste() {
    const clip = await Clipboard.getStringAsync().catch(() => '');
    if (clip) setText(clip);
  }

  return (
    <TabScreen
      refreshing={orders.loading}
      onRefresh={() => void Promise.all([orders.refresh(), catalogue.refresh()])}
    >
      <View className="gap-3">
        {firstName ? <Eyebrow>{`Hi ${firstName}`}</Eyebrow> : null}
        <Text variant="h1">Got a forward? Check it before you share it.</Text>
        <Text variant="lead">
          We check it against Indian fact-checkers, live news and official sources, and show you
          every source we used.
        </Text>
      </View>

      {/* Check a forward without leaving home */}
      <Panel className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="label">Paste a message or link</Text>
          <Button variant="ghost" size="sm" onPress={() => void paste()}>
            <Icon as={ClipboardPaste} size={15} />
            <Text>Paste</Text>
          </Button>
        </View>
        <Textarea
          value={text}
          onChangeText={setText}
          placeholder="A WhatsApp forward in English, Hindi or another Indian language"
          className="min-h-24"
          maxLength={10_000}
          accessibilityLabel="Message or link to check"
        />
        <ActionButton title="Check it" variant="accent" icon={ArrowRight} onPress={check} />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/fact-check')}
          className="self-start py-1"
        >
          <Text className="text-body-sm text-brand underline">Check a screenshot instead</Text>
        </Pressable>
      </Panel>

      {active ? <ActiveOrder order={active} /> : null}

      {/* How to read a verdict: the four verdicts in their own colours */}
      <View className="gap-3">
        <StepHeading title="How to read a verdict" />
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {VERDICT_MEANINGS.map(([v, what]) => {
            const VerdictIcon = VERDICT_ICONS[v];
            return (
              <View
                key={v}
                className="w-[48.5%] gap-1.5 rounded-lg p-3"
                style={{ backgroundColor: VERDICT_TINTS[v] }}
              >
                <View className="flex-row items-center gap-1.5">
                  <VerdictIcon size={16} color={VERDICT_COLORS[v]} />
                  <Text
                    className="font-sans-semibold text-label-sm"
                    style={{ color: VERDICT_COLORS[v] }}
                  >
                    {FC_VERDICT_LABELS[v]}
                  </Text>
                </View>
                <Text className="text-[13px] leading-[18px] text-body">{what}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Publish your story: the one dark panel on the page */}
      <View className="gap-4 rounded-xl bg-ink p-5">
        <Text className="font-sans-semibold text-label-sm text-white/70">Publish your story</Text>
        <Text className="font-display text-headline-md text-white">
          {pkg
            ? `Get your story on ${pkg.portalCount} high-DA news portals${pkg.includesInstagram ? ' and our Instagram' : ''}.`
            : 'Get your story on our news portals.'}
        </Text>
        {pkg ? (
          <Text className="text-body-sm text-white/70">
            <Text className="font-display text-headline-sm text-white">
              {formatMoney(pkg.priceInrPaise)}
            </Text>
            {'  '}all taxes included
          </Text>
        ) : null}
        <View className="gap-2">
          {[
            pkg ? `Live within ${pkg.turnaroundHours} hours of payment` : 'Live within 24 hours',
            'Our editorial team reads every story first',
            'A PDF report with every live link',
          ].map((line) => (
            <View key={line} className="flex-row items-center gap-2">
              <Icon as={Check} size={16} className="text-white/70" />
              <Text className="flex-1 text-body-sm text-white">{line}</Text>
            </View>
          ))}
        </View>
        <Button
          size="lg"
          className="bg-paper active:bg-subtle"
          onPress={() => router.push('/publish')}
        >
          <Text className="text-ink">Publish your story</Text>
          <Icon as={ArrowRight} size={16} className="text-ink" />
        </Button>
        <Text className="text-[12px] text-white/60">
          Paid stories are published as sponsored content. Payments by Razorpay.
        </Text>
      </View>

      {/* Recently published (admin showcase): real stories, real links */}
      {showcase.length ? (
        <View className="gap-3">
          <StepHeading title="Recently published" />
          {showcase.map((s, i) => (
            <Pressable
              key={s.id}
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(s.url)}
              className={
                i === 0
                  ? 'gap-2 pb-1'
                  : 'flex-row items-center gap-3 border-t border-divider pt-3 active:opacity-80'
              }
            >
              {s.imagePath ? (
                <Image
                  source={{ uri: publicAssetUrl(supabaseUrl, s.imagePath) }}
                  contentFit="cover"
                  style={
                    i === 0
                      ? { width: '100%', aspectRatio: 16 / 9, borderRadius: 6 }
                      : { width: 80, height: 60, borderRadius: 6 }
                  }
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View className="flex-1 gap-1">
                <Text className="text-[12px] text-slate">{s.portalName}</Text>
                <Text
                  className={
                    i === 0
                      ? 'font-display text-headline-sm text-ink'
                      : 'font-sans-semibold text-label-md text-ink'
                  }
                  numberOfLines={i === 0 ? 3 : 2}
                >
                  {s.title}
                </Text>
                {i === 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-body-sm text-brand">Read on {s.portalName}</Text>
                    <Icon as={ArrowUpRight} size={14} className="text-brand" />
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {portals.length ? (
        <View className="gap-3">
          <StepHeading title="Our publishing network" aside={`${portals.length} portals`} />
          <PortalWall portals={portals} limit={6} />
          {portals.length > 6 ? (
            <ActionButton
              title={`See all ${portals.length} portals`}
              variant="outline"
              size="default"
              onPress={() => router.push('/publish')}
            />
          ) : null}
        </View>
      ) : null}

      <View className="gap-3">
        <StepHeading title="Where we look" />
        <SourceStrip />
      </View>
    </TabScreen>
  );
}

/** The signed-in user's order in progress: where it is on the way to published. */
function ActiveOrder({
  order,
}: {
  order: { id: string; orderNumber: string; status: string; headline: string };
}) {
  const at = order.status === 'changes_requested' ? 3 : PATH.indexOf(order.status as OrderStatus);
  const progress = Math.max(at, 0) / (PATH.length - 1);
  return (
    <View className="gap-3">
      <StepHeading title="Your active order" />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
        className="gap-3 rounded-lg border border-hairline bg-paper p-4 active:border-ink"
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-mono text-code text-slate">{order.orderNumber}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="label">{order.headline || 'Untitled story'}</Text>
        <View className="h-1 overflow-hidden rounded-full bg-elevated">
          <View
            className={order.status === 'changes_requested' ? 'h-full bg-warn' : 'h-full bg-brand'}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
        <View className="flex-row items-center justify-end gap-1">
          <Text className="text-body-sm text-brand">View order</Text>
          <Icon as={ChevronRight} size={16} className="text-brand" />
        </View>
      </Pressable>
    </View>
  );
}
