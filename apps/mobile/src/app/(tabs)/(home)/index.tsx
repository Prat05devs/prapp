import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Bell,
  ChevronRight,
  ClipboardPaste,
  FileCheck2,
  Newspaper,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import {
  BRAND_LINE,
  BRAND_NAME,
  FACT_CHECK_CAMPAIGN,
  SOCIAL_CHANNEL_LABELS,
  SOCIAL_CHANNEL_POSTS,
  STORY_CAMPAIGNS,
  formatMoney,
  offerSocialChannels,
  publicAssetUrl,
  type OrderStatus,
} from '@prapp/shared';
import type { CataloguePackage, CataloguePortal } from '@prapp/api-client';
import { campaignSource } from '@/components/campaign-image';
import {
  AutoCarousel,
  GrowBar,
  Marquee,
  Pop,
  PressableScale,
  type CarouselSlide,
} from '@/components/motion';
import { StatusBadge } from '@/components/status-badge';
import { Group, Icon, Row, ScrollScreen, Section, Text } from '@/components/ui';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useOrders } from '@/hooks/use-orders';
import { appEnv } from '@/lib/env';
import { promptSignIn } from '@/lib/sign-in-prompt';
import { COLORS } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';

const ACTIVE = ['pending_payment', 'paid', 'in_progress', 'changes_requested'];
/** The customer's happy path, for the active-order progress bar (same as OrderTimeline). */
const PATH: OrderStatus[] = ['draft', 'pending_payment', 'paid', 'in_progress', 'published'];

type CheckMode = 'text' | 'url' | 'image';

const openCheck = (mode: CheckMode, text?: string) =>
  router.navigate({ pathname: '/fact-check', params: { mode, ...(text ? { text } : {}) } });
const openPublish = () => router.navigate('/publish');

/**
 * Home (LLD §13, wireframe in docs/MOBILE-UX.md): photo slider · the two services · paste a
 * forward · your active order · how publishing works · our network · the PDF report · recently
 * published. Every number and name on it comes from the catalogue or the user's own orders
 * (docs/DESIGN.md: real content only); the slider uses the client-supplied campaign scenes.
 */
export default function HomeScreen() {
  const { me, session } = useAuth();
  const orders = useOrders();
  const catalogue = useCatalogue();
  const active = orders.data?.find((o) => ACTIVE.includes(o.status));
  const pkg = catalogue.data?.packages[0];
  const showcase = catalogue.data?.showcase ?? [];
  const portals = catalogue.data?.portals ?? [];
  const firstName = me?.fullName?.split(' ')[0];
  const price = pkg ? formatMoney(pkg.priceInrPaise) : null;

  const slides: CarouselSlide[] = [
    {
      key: FACT_CHECK_CAMPAIGN.id,
      image: campaignSource(FACT_CHECK_CAMPAIGN.id),
      alt: FACT_CHECK_CAMPAIGN.alt,
      kicker: 'Fact check · free',
      title: FACT_CHECK_CAMPAIGN.title,
      cta: FACT_CHECK_CAMPAIGN.cta,
      onPress: () => openCheck('text'),
    },
    ...STORY_CAMPAIGNS.map((c) => ({
      key: c.id,
      image: campaignSource(c.id),
      alt: c.alt,
      kicker: price ? `Publish your story · ${price}` : 'Publish your story',
      title: c.title,
      cta: c.cta,
      onPress: openPublish,
    })),
  ];

  async function paste() {
    const clip = await Clipboard.getStringAsync().catch(() => '');
    openCheck(/^https?:\/\/\S+$/i.test(clip.trim()) ? 'url' : 'text', clip.trim() || undefined);
  }

  return (
    <ScrollScreen
      refreshing={orders.loading}
      onRefresh={() => void Promise.all([orders.refresh(), catalogue.refresh()])}
      header={{
        kicker: firstName ? `Namaste, ${firstName}` : BRAND_LINE,
        title: BRAND_NAME,
        right: session ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            scaleTo={0.9}
            haptic="tap"
            onPress={() => router.push('/notifications')}
            className="h-11 w-11 items-center justify-center rounded-full border border-hairline bg-paper active:bg-subtle"
          >
            <Icon as={Bell} size={20} className="text-ink" />
          </PressableScale>
        ) : (
          <PressableScale
            accessibilityRole="button"
            scaleTo={0.94}
            haptic="tap"
            onPress={() => promptSignIn({ mode: 'login' })}
            className="h-11 justify-center rounded-full border border-hairline bg-paper px-4 active:bg-subtle"
          >
            <Text className="font-sans-semibold text-[15px] text-brand">Log in</Text>
          </PressableScale>
        ),
      }}
    >
      <View className="-mb-2">
        <AutoCarousel slides={slides} height={300} />
      </View>

      <View className="-mb-2 gap-2.5">
        <View className="flex-row gap-2.5">
          <ServiceTile
            tone="brand"
            icon={ShieldCheck}
            title="Fact check"
            body="Free · text, link or screenshot"
            onPress={() => openCheck('text')}
          />
          <ServiceTile
            tone="ink"
            icon={Newspaper}
            title="Publish your story"
            body={pkg ? channelsShort(pkg) : 'News portals and social media'}
            badge={price}
            onPress={openPublish}
          />
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Paste a forward to check"
          scaleTo={0.98}
          onPress={() => openCheck('text')}
          className="h-14 flex-row items-center gap-2.5 rounded-2xl border border-hairline bg-paper pl-4 pr-2"
        >
          <Icon as={Search} size={18} className="text-slate" />
          <Text className="flex-1 text-body-md text-slate">Got a forward? Paste it here</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Paste from clipboard and check"
            scaleTo={0.92}
            haptic="tap"
            onPress={() => void paste()}
            className="h-10 flex-row items-center gap-1.5 rounded-md bg-subtle px-3.5 active:bg-elevated"
          >
            <Icon as={ClipboardPaste} size={16} className="text-ink" />
            <Text className="font-sans-semibold text-label-sm text-ink">Paste</Text>
          </PressableScale>
        </PressableScale>
      </View>

      {active ? <ActiveOrder order={active} /> : null}

      {pkg ? <HowPublishingWorks pkg={pkg} /> : null}

      {portals.length ? (
        <Section
          title="Where your story appears"
          action={{ label: 'See all', onPress: openPublish }}
        >
          <Marquee>
            {portals.map((p) => (
              <NetworkTile key={p.domain} portal={p} />
            ))}
            {pkg
              ? offerSocialChannels(pkg).map((c) => (
                  <ChannelTile
                    key={c}
                    name={SOCIAL_CHANNEL_LABELS[c]}
                    kind={SOCIAL_CHANNEL_POSTS[c]}
                  />
                ))
              : null}
          </Marquee>
        </Section>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        scaleTo={0.98}
        haptic="tap"
        onPress={() => openCheck('text')}
        className="flex-row items-center gap-4 rounded-2xl bg-subtle p-4 active:bg-elevated"
      >
        <View
          className="h-[104px] w-20 gap-1 rounded-sm border border-hairline bg-paper p-2"
          style={{ transform: [{ rotate: '-4deg' }] }}
        >
          <View className="h-3 rounded-[3px] bg-verified-tint" />
          <View className="h-1 w-4/5 rounded-full bg-elevated" />
          <View className="h-1 w-3/5 rounded-full bg-elevated" />
          <View className="h-1 w-3/4 rounded-full bg-elevated" />
          <View className="mt-auto self-end">
            <Icon as={FileCheck2} size={22} className="text-ink" />
          </View>
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-display text-[19px] leading-6 text-ink">
            A report you can forward back
          </Text>
          <Text className="text-body-sm text-body">
            Every check comes with its sources and a PDF. The QR code on it proves it came from
            NewsVio.
          </Text>
        </View>
      </PressableScale>

      {/* Recently published (admin showcase): real stories, real links */}
      {showcase.length ? (
        <Section title="Recently published">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerClassName="gap-3 px-4"
            decelerationRate="fast"
            snapToInterval={252}
          >
            {showcase.map((s) => (
              <PressableScale
                key={s.id}
                accessibilityRole="link"
                onPress={() => void WebBrowser.openBrowserAsync(s.url)}
                className="w-60 gap-2"
              >
                {s.imagePath ? (
                  <Image
                    source={{
                      uri: publicAssetUrl(appEnv().EXPO_PUBLIC_SUPABASE_URL, s.imagePath),
                    }}
                    contentFit="cover"
                    transition={250}
                    style={{ width: 240, height: 135, borderRadius: 14 }}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <View className="h-[135px] w-60 justify-end rounded-[14px] bg-elevated p-3">
                    <Text className="font-display text-[15px] text-ink">{s.portalName}</Text>
                  </View>
                )}
                <View className="gap-0.5 px-0.5">
                  <Text className="text-[12px] text-slate">{s.portalName}</Text>
                  <Text numberOfLines={2} className="font-sans-semibold text-label-md text-ink">
                    {s.title}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Group>
        <Row
          icon={Search}
          label="How we check"
          subtitle="What each verdict means and where we look"
          onPress={() => router.push('/how-we-check')}
        />
      </Group>
    </ScrollScreen>
  );
}

/** "5 portals · Instagram · Facebook" */
function channelsShort(pkg: CataloguePackage) {
  return [
    pkg.portalCount ? `${pkg.portalCount} portals` : null,
    ...offerSocialChannels(pkg).map((c) => SOCIAL_CHANNEL_LABELS[c]),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** One of the two services: a solid tile that sinks under the finger. */
function ServiceTile({
  tone,
  icon,
  title,
  body,
  badge,
  onPress,
}: {
  tone: 'brand' | 'ink';
  icon: typeof Search;
  title: string;
  body: string;
  badge?: string | null;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[title, badge, body].filter(Boolean).join('. ')}
      haptic="tap"
      onPress={onPress}
      className={
        tone === 'brand'
          ? 'h-[158px] flex-1 justify-between rounded-[18px] bg-brand p-4 active:bg-brand-deep'
          : 'h-[158px] flex-1 justify-between rounded-[18px] bg-ink p-4 active:bg-ink-soft'
      }
    >
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Icon as={icon} size={20} className="text-white" />
        </View>
        {badge ? (
          <Pop delay={450}>
            <View className="rounded-full bg-paper px-2.5 py-0.5">
              <Text className="font-sans-semibold text-[13px] tabular-nums text-ink">{badge}</Text>
            </View>
          </Pop>
        ) : null}
      </View>
      <View className="gap-1">
        <Text className="font-display text-[20px] leading-6 text-white">{title}</Text>
        <Text className="text-[13px] leading-[18px] text-white/80">{body}</Text>
      </View>
    </PressableScale>
  );
}

/** Write → pay → go live, with the connector drawing itself across. */
function HowPublishingWorks({ pkg }: { pkg: CataloguePackage }) {
  const steps = [
    { title: 'Write it', body: 'Headline, story and 1–2 photos' },
    { title: `Pay ${formatMoney(pkg.priceInrPaise)}`, body: 'GST included' },
    { title: 'Go live', body: `Within ${pkg.turnaroundHours} hours, once approved` },
  ];
  return (
    <PressableScale
      accessibilityRole="button"
      scaleTo={0.985}
      onPress={openPublish}
      className="gap-4"
    >
      <View className="gap-1 px-1">
        <Text className="font-display text-headline-sm text-ink">
          Your story in the news, without an agency
        </Text>
        <Text className="text-body-sm text-slate">
          Write it, pay once, and we send you every live link and a PDF report.
        </Text>
      </View>
      <View>
        <View className="absolute left-[16%] right-[16%] top-[19px]">
          <GrowBar value={1} delay={400} color={COLORS.brand} className="h-0.5" />
        </View>
        <View className="flex-row">
          {steps.map((s, i) => (
            <View key={s.title} className="flex-1 items-center gap-1.5 px-1">
              <Pop delay={300 + i * 220} bounce={13}>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
                  <Text className="font-sans-semibold text-[15px] text-white">{i + 1}</Text>
                </View>
              </Pop>
              <Text className="text-center font-sans-semibold text-label-sm text-ink">
                {s.title}
              </Text>
              <Text className="text-center text-[12px] leading-4 text-slate">{s.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </PressableScale>
  );
}

function NetworkTile({ portal }: { portal: CataloguePortal }) {
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={portal.name}
      onPress={() => void WebBrowser.openBrowserAsync(portal.homepageUrl)}
      className="h-16 w-36 items-center justify-center gap-0.5 rounded-[14px] border border-hairline bg-paper px-3 active:bg-subtle"
    >
      {portal.logoPath ? (
        <Image
          source={{ uri: publicAssetUrl(appEnv().EXPO_PUBLIC_SUPABASE_URL, portal.logoPath) }}
          contentFit="contain"
          style={{ width: '100%', height: 26 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text numberOfLines={1} className="text-center font-display text-[15px] text-ink">
          {portal.name}
        </Text>
      )}
      <Text numberOfLines={1} className="text-[11px] text-slate">
        {portal.domain}
      </Text>
    </PressableScale>
  );
}

function ChannelTile({ name, kind }: { name: string; kind: string }) {
  return (
    <View className="h-16 w-36 items-center justify-center gap-0.5 rounded-[14px] bg-ink px-3">
      <Text className="font-display text-[15px] text-white">{name}</Text>
      <Text className="text-[11px] text-white/70">{kind}</Text>
    </View>
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
    <Section title="Your order">
      <PressableScale
        accessibilityRole="button"
        scaleTo={0.98}
        haptic="tap"
        onPress={() => router.navigate({ pathname: '/orders/[id]', params: { id: order.id } })}
        className="gap-3 rounded-2xl border border-hairline bg-paper p-4 active:bg-subtle"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-mono text-code text-slate">{order.orderNumber}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text numberOfLines={2} className="font-sans-semibold text-[16px] text-ink">
          {order.headline || 'Untitled story'}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <GrowBar
              value={progress}
              delay={300}
              color={order.status === 'changes_requested' ? COLORS.warn : COLORS.brand}
            />
          </View>
          <Icon as={ChevronRight} size={18} className="text-faint" />
        </View>
      </PressableScale>
    </Section>
  );
}
