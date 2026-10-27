import { ArrowRight, Newspaper } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  FEATURE_CONSENT_TEXT,
  SOCIAL_CHANNEL_LABELS,
  SPONSORED_DISCLOSURE,
  STORY_CAMPAIGNS,
  formatMoney,
  offerLine,
  offerSocialChannels,
  type OrderContentInput,
} from '@prapp/shared';
import type { CataloguePackage } from '@prapp/api-client';
import { campaignSource } from '@/components/campaign-image';
import { AutoCarousel, Pop, type CarouselSlide } from '@/components/motion';
import { siteUrl } from '@/lib/env';
import { PackagePicker } from '@/components/package-picker';
import { PortalWall } from '@/components/portal-wall';
import { PublishSteps } from '@/components/publish-steps';
import { StoryFields } from '@/components/story-fields';
import {
  ActionButton,
  Card,
  CheckRow,
  ErrorText,
  Group,
  Icon,
  Row,
  ScrollScreen,
  Section,
  Text,
} from '@/components/ui';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useCreateDraft } from '@/hooks/use-order-editor';
import { useAuth } from '@/providers/auth-provider';

/** "What's your story?" over the client-supplied campaign scenes (public/USAGE.md). */
const SCENES: CarouselSlide[] = STORY_CAMPAIGNS.map((c) => ({
  key: c.id,
  image: campaignSource(c.id),
  alt: c.alt,
  title: c.prompt,
}));

// Publish (LLD §13, wireframe in docs/MOBILE-UX.md): what's your story · what you get · package →
// story → save, with the total and "Add images" in the bottom bar. Images and payment follow on
// the edit screen.
export default function PublishScreen() {
  const catalogue = useCatalogue();
  const [showNetwork, setShowNetwork] = useState(false);
  const { pending, fieldErrors, error, create } = useCreateDraft();
  const { session } = useAuth();
  const [content, setContent] = useState<OrderContentInput>({
    packageId: '',
    headline: '',
    body: '',
    instagramHandle: '',
    featureConsent: false,
    declarationAccepted: false,
  });
  // Default to the first package until the user picks one (derived, not synced in an effect).
  const packageId = content.packageId || catalogue.data?.packages[0]?.id || '';
  const selected = catalogue.data?.packages.find((p) => p.id === packageId);
  const portals = catalogue.data?.portals ?? [];
  const update = (patch: Partial<OrderContentInput>) => setContent((c) => ({ ...c, ...patch }));

  return (
    <ScrollScreen
      header={{ title: 'Publish', lede: 'Your story in the news, without an agency.' }}
      footer={
        <>
          <ErrorText>{error ?? fieldErrors.packageId}</ErrorText>
          <View className="flex-row items-center gap-4">
            <View className="gap-0.5">
              <Text className="text-[12px] text-slate">Total, GST included</Text>
              <Text className="font-sans-semibold text-[19px] tabular-nums text-ink">
                {selected ? formatMoney(selected.priceInrPaise) : '-'}
              </Text>
            </View>
            <ActionButton
              title="Add images"
              variant="accent"
              icon={ArrowRight}
              className="flex-1"
              loading={pending}
              onPress={() => void create({ ...content, packageId })}
            />
          </View>
        </>
      }
    >
      <AutoCarousel slides={SCENES} height={210} interval={4500} indicator="dots" />

      <PublishSteps current={1} />

      {selected ? (
        <ChannelsCard pkg={selected} />
      ) : (
        <Text className="text-body-md text-body">
          Write your story, add 1–2 images and pay online. After editorial approval, we publish it
          and send you every live link.
        </Text>
      )}

      {catalogue.data ? (
        <Section title="Package">
          <PackagePicker
            packages={catalogue.data.packages}
            value={packageId}
            onChange={(packageId) => update({ packageId })}
          />
        </Section>
      ) : null}

      <Section title="Your story">
        <Card>
          <StoryFields value={content} onChange={update} errors={fieldErrors} />
        </Card>
        <View className="px-1 pt-2">
          <CheckRow
            checked={content.featureConsent ?? false}
            onChange={(featureConsent) => update({ featureConsent })}
          >
            {FEATURE_CONSENT_TEXT}
          </CheckRow>
        </View>
      </Section>

      {portals.length ? (
        <Section
          footer={
            session
              ? `You review your package and pay after adding images. ${SPONSORED_DISCLOSURE}`
              : `Next you'll log in or create an account, then add images and pay. ${SPONSORED_DISCLOSURE}`
          }
        >
          <Group>
            <Row
              label={`Our network · ${portals.length} portals`}
              subtitle="Your package sets the number of placements; our team selects suitable portals"
              value={showNetwork ? 'Hide' : 'Show'}
              onPress={() => setShowNetwork((v) => !v)}
            />
          </Group>
          {showNetwork ? (
            <View className="pt-1">
              <PortalWall portals={portals} />
            </View>
          ) : null}
          <Group>
            <Row
              label="Request a custom plan"
              subtitle="Need more portals or specific social pages?"
              external
              onPress={() => void WebBrowser.openBrowserAsync(`${siteUrl()}/support`)}
            />
          </Group>
        </Section>
      ) : null}
    </ScrollScreen>
  );
}

/** What the package buys, each channel popping in: the one dark card on the screen. */
function ChannelsCard({ pkg }: { pkg: CataloguePackage }) {
  const portals = Array.from({ length: Math.min(pkg.portalCount, 6) }, (_, i) => i);
  const socials = offerSocialChannels(pkg).map((c) => SOCIAL_CHANNEL_LABELS[c]);
  return (
    <View className="gap-3.5 rounded-[20px] bg-ink p-[18px]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-[13px] text-white/70">{pkg.name}</Text>
          <Text className="font-display text-[22px] leading-7 text-white">
            Where your story goes
          </Text>
        </View>
        <View className="rounded-full bg-paper px-3 py-1">
          <Text className="font-sans-semibold text-[15px] tabular-nums text-ink">
            {formatMoney(pkg.priceInrPaise)}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {portals.map((i) => (
          <Pop key={i} delay={250 + i * 70}>
            <View className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-white/10">
              <Icon as={Newspaper} size={18} className="text-white" />
            </View>
          </Pop>
        ))}
        {socials.map((name, i) => (
          <Pop key={name} delay={250 + (portals.length + i) * 70}>
            <View className="h-[42px] items-center justify-center rounded-[12px] bg-paper px-3">
              <Text className="font-sans-semibold text-[13px] text-ink">{name}</Text>
            </View>
          </Pop>
        ))}
      </View>
      <Text className="text-[14px] leading-5 text-white/85">
        {`${offerLine(pkg)} Our editorial team reviews every story; approved stories go live within ${pkg.turnaroundHours} hours of payment.`}
      </Text>
    </View>
  );
}
