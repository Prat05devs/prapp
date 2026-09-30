import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquareText,
  Share2,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';
import { FC_TOOL_LABELS } from '@prapp/shared';
import { ReportView } from '@/components/report-view';
import {
  ActionButton,
  Badge,
  CheckRow,
  Eyebrow,
  Field,
  Icon,
  LiveDot,
  LivePill,
  Notice,
  PageHeader,
  Panel,
  TabScreen,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';
import { useFactCheck } from '@/hooks/use-fact-check';
import { appEnv } from '@/lib/env';
import { COLORS } from '@/lib/theme';

type Mode = 'text' | 'url' | 'image';

const MODES: { mode: Mode; label: string; icon: typeof ImageIcon }[] = [
  { mode: 'text', label: 'Text', icon: MessageSquareText },
  { mode: 'url', label: 'Link', icon: LinkIcon },
  { mode: 'image', label: 'Screenshot', icon: ImageIcon },
];

/** The steps the pipeline runs for each kind of input (LLD §11.2), shown while it works. */
const STEPS: Record<Mode, string[]> = {
  text: ['claim_extraction', 'google_fact_check', 'gemini_search', 'gdelt', 'llm_judge'],
  url: ['fetch_url', 'rdap', 'claim_extraction', 'google_fact_check', 'gemini_search', 'llm_judge'],
  image: ['ocr', 'claim_extraction', 'google_fact_check', 'gemini_search', 'llm_judge'],
};

const TEXT_MAX = 10_000;

export default function FactCheckScreen() {
  const fc = useFactCheck();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const busy = fc.phase === 'submitting' || fc.phase === 'checking';
  const reportUrl = fc.report ? `${appEnv().EXPO_PUBLIC_API_URL}/r/${fc.report.reportId}` : '';

  async function shareImage() {
    // Share image (LLD §11.4): download the PNG card and hand it to the share sheet.
    const file = await File.downloadFileAsync(
      `${reportUrl}/image.png`,
      new File(Paths.cache, `${fc.report!.reportId}.png`),
      {
        idempotent: true,
      },
    );
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png' });
  }

  if (fc.report && fc.phase === 'done') {
    return (
      <TabScreen>
        <ReportView report={fc.report} reportUrl={reportUrl} />
        <Panel tone="subtle">
          <CheckRow checked={fc.report.isPublic} onChange={(v) => void fc.setPublic(v)}>
            Anyone with the link can see this report
          </CheckRow>
          {fc.report.isPublic ? (
            <View className="gap-2">
              <ActionButton
                title="Share link"
                variant="accent"
                icon={Share2}
                onPress={() => void Share.share({ message: reportUrl, url: reportUrl })}
              />
              <ActionButton
                title="Share image"
                variant="outline"
                icon={ImageIcon}
                onPress={() => void shareImage().catch(() => {})}
              />
            </View>
          ) : null}
        </Panel>
        <ActionButton
          title="Check something else"
          variant="ghost"
          icon={ArrowLeft}
          onPress={fc.reset}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <View className="gap-4">
        <LivePill>Free · with sources</LivePill>
        <PageHeader
          title="Is this forward true?"
          lede="Paste a message, a link or a screenshot. We check it against public sources."
        />
      </View>

      <Panel className="gap-5">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Eyebrow accent>01</Eyebrow>
            <Text className="text-xs text-faint">/</Text>
            <Text variant="h3">Paste the forward</Text>
          </View>
          <Text variant="muted">A message, a link or a screenshot.</Text>
        </View>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="mr-0 w-full">
            {MODES.map((m) => (
              <TabsTrigger key={m.mode} value={m.mode} className="flex-1">
                <Icon
                  as={m.icon}
                  size={15}
                  className={mode === m.mode ? 'text-emerald-strong' : 'text-slate'}
                />
                <Text>{m.label}</Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {mode === 'text' ? (
          <Field
            label="Message"
            aside={`${text.length.toLocaleString('en-IN')} / ${TEXT_MAX.toLocaleString('en-IN')}`}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Paste the message or forward you want to check"
            className="min-h-36 bg-subtle"
            maxLength={TEXT_MAX}
          />
        ) : mode === 'url' ? (
          <Field
            label="Link"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            className="bg-subtle"
            placeholder="Paste a link to a post, article or video"
          />
        ) : (
          <View className="items-center gap-2 rounded-xl border border-dashed border-hairline bg-subtle px-4 py-8">
            <View className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas">
              <Icon as={Upload} size={18} className="text-slate" />
            </View>
            <Text variant="label">Pick a screenshot of the forward</Text>
            <Text variant="muted">We read the text in it. JPG, PNG or WebP.</Text>
          </View>
        )}

        <ActionButton
          title={mode === 'image' ? 'Choose screenshot' : 'Check it'}
          variant="accent"
          icon={mode === 'image' ? Upload : ArrowRight}
          loading={busy}
          onPress={() =>
            void (mode === 'text'
              ? fc.checkText(text)
              : mode === 'url'
                ? fc.checkUrl(url)
                : fc.checkScreenshot())
          }
        />
        <View className="flex-row items-center gap-2">
          <Icon as={ShieldCheck} size={14} className="text-emerald-strong" />
          <Text className="font-mono text-code text-slate">Every answer lists its sources</Text>
        </View>
      </Panel>

      {fc.phase === 'checking' || fc.phase === 'submitting' ? (
        <Panel>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <LiveDot />
              <Text variant="label">Checking sources</Text>
            </View>
            <Badge variant="emerald">
              <Text>Running</Text>
            </Badge>
          </View>
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={COLORS.emerald} />
            <Text variant="muted">This usually takes under a minute.</Text>
          </View>
          <View className="gap-2">
            {STEPS[mode].map((tool, i) => (
              <View
                key={tool}
                className="flex-row items-center gap-3 rounded-lg border border-divider bg-subtle px-3 py-2"
              >
                <Text className="font-mono text-code text-faint">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text className="flex-1 text-body-sm text-body">{FC_TOOL_LABELS[tool]}</Text>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}
      {fc.phase === 'slow' ? (
        <Notice title="This is taking longer than usual">
          We&apos;ll notify you when your report is ready.
        </Notice>
      ) : null}
      {fc.error ? <Notice tone="danger">{fc.error.message}</Notice> : null}

      <View className="flex-row items-center gap-2 self-center">
        <Icon as={Zap} size={12} className="text-faint" />
        <Text className="font-mono text-[11px] uppercase text-faint">
          Google Fact Check Tools · Gemini · GDELT · Wikipedia · RDAP
        </Text>
      </View>
    </TabScreen>
  );
}
