import * as WebBrowser from 'expo-web-browser';
import { Link, QrCode } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { FACT_CHECK_CAMPAIGN, FC_VERDICT_LABELS } from '@prapp/shared';
import { CampaignImage } from '@/components/campaign-image';
import { SourceStrip } from '@/components/source-strip';
import { Group, Row, Section, Text } from '@/components/ui';
import { VERDICT_COLORS, VERDICT_ICONS, VERDICT_MEANINGS } from '@/components/verdict-style';
import { siteUrl } from '@/lib/env';

/**
 * Reference sheet (docs/MOBILE-UX.md): what each verdict means and where we look. Opened from
 * home and the fact-check screen; it used to be two sections of the home page.
 */
export default function HowWeCheckSheet() {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-7 px-4 pb-12 pt-6"
      nestedScrollEnabled
    >
      <View className="gap-1.5 px-1">
        <Text variant="h2">How we check</Text>
        <Text className="text-body-md text-body">
          We search recognised fact-checkers, live reporting and official sources, then show you the
          evidence we found. Verdicts express the strength of that evidence, not absolute certainty.
          When the evidence is insufficient, we say so.
        </Text>
      </View>

      <CampaignImage campaign={FACT_CHECK_CAMPAIGN} />

      <Section title="How to read a verdict">
        <Group>
          {VERDICT_MEANINGS.map(([v, what]) => (
            <Row
              key={v}
              icon={VERDICT_ICONS[v]}
              iconColor={VERDICT_COLORS[v]}
              label={FC_VERDICT_LABELS[v]}
              subtitle={what}
            />
          ))}
        </Group>
      </Section>

      <Section title="Where we look">
        <SourceStrip />
      </Section>

      <Section title="Your report">
        <Group>
          <Row
            icon={Link}
            label="A page with every source"
            subtitle="Make it public to share it as a link or an image"
          />
          <Row
            icon={QrCode}
            label="A PDF you can forward"
            subtitle="Its QR code opens the original report on our site, so anyone can confirm it is genuine"
          />
        </Group>
      </Section>

      <Section footer="Tools we use: Google Fact Check Tools, Gemini with Google Search, GDELT, Wikipedia and RDAP.">
        <Group>
          <Row
            label="Read our full method"
            external
            onPress={() => void WebBrowser.openBrowserAsync(`${siteUrl()}/methodology`)}
          />
        </Group>
      </Section>
    </ScrollView>
  );
}
