import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquareText,
  Share2,
  Upload,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';
import { FC_TOOL_LABELS } from '@prapp/shared';
import { ReportView } from '@/components/report-view';
import {
  ActionButton,
  CheckRow,
  Field,
  Icon,
  LiveDot,
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
import { SIGN_IN_REASONS, promptSignIn } from '@/lib/sign-in-prompt';
import { COLORS } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';

type Mode = 'text' | 'url' | 'image';

const MODES: { mode: Mode; label: string; icon: typeof ImageIcon }[] = [
  { mode: 'text', label: 'Text', icon: MessageSquareText },
  { mode: 'url', label: 'Link', icon: LinkIcon },
  { mode: 'image', label: 'Screenshot', icon: ImageIcon },
];

/** The steps the pipeline runs for each kind of input (LLD §11.2), shown while it works. */
const STEPS: Record<Mode, string[]> = {
  text: [
    'claim_extraction',
    'google_fact_check',
    'fact_checker_search',
    'google_news',
    'llm_judge',
  ],
  url: ['fetch_url', 'rdap', 'claim_extraction', 'google_fact_check', 'google_news', 'llm_judge'],
  image: ['ocr', 'claim_extraction', 'google_fact_check', 'google_news', 'llm_judge'],
};

const TEXT_MAX = 10_000;

export default function FactCheckScreen() {
  const fc = useFactCheck();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ text?: string }>();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  // Sent from the home page's "Check it": fill in the message (during render, React's pattern for
  // state that follows a prop), then run the check and clear the param.
  const sent = typeof params.text === 'string' ? params.text : '';
  const [filled, setFilled] = useState('');
  if (sent !== filled) {
    setFilled(sent);
    if (sent) {
      setMode('text');
      setText(sent);
    }
  }
  useEffect(() => {
    if (!sent) return;
    router.setParams({ text: undefined });
    void fc.checkText(sent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per message sent from home
  }, [sent]);

  const busy = fc.phase === 'submitting' || fc.phase === 'checking';
  const reportId = fc.report?.reportId;
  const reportUrl = reportId ? `${appEnv().EXPO_PUBLIC_API_URL}/r/${reportId}` : '';

  async function shareImage() {
    // Share image (LLD §11.4): download the PNG card and hand it to the share sheet.
    const file = await File.downloadFileAsync(
      `${reportUrl}/image.png`,
      new File(Paths.cache, `${reportId ?? 'report'}.png`),
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
      <PageHeader
        eyebrow="Free fact check"
        title="Is this forward true?"
        lede="Paste a message, a link or a screenshot. We check it against public sources."
      />

      <Panel className="gap-4">
        <Text variant="label">What do you want to check?</Text>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="mr-0 w-full">
            {MODES.map((m) => (
              <TabsTrigger key={m.mode} value={m.mode} className="flex-1">
                <Icon
                  as={m.icon}
                  size={15}
                  className={mode === m.mode ? 'text-brand' : 'text-slate'}
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
            className="min-h-36"
            maxLength={TEXT_MAX}
          />
        ) : mode === 'url' ? (
          <Field
            label="Link"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="Paste a link to a post, article or video"
          />
        ) : (
          <View className="items-center gap-2 rounded-md border border-dashed border-input bg-paper px-4 py-8">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-subtle">
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
        <Text variant="muted">Every answer links to its sources.</Text>
      </Panel>

      {fc.phase === 'checking' || fc.phase === 'submitting' ? (
        <Panel>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <LiveDot />
              <Text variant="label">Checking sources</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text variant="muted">This usually takes under a minute.</Text>
          </View>
          <View className="gap-1.5">
            <Text className="font-sans-semibold text-label-sm text-ink">
              What we&apos;re running
            </Text>
            {STEPS[mode].map((tool) => (
              <View key={tool} className="flex-row items-center gap-2.5">
                <View className="h-1 w-1 rounded-full bg-faint" />
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
      {fc.error?.code === 'fact_check_limit_reached' && !session ? (
        <Panel tone="subtle" className="gap-3">
          <Text variant="h3">Keep checking for free</Text>
          <Text variant="p">{SIGN_IN_REASONS['fact-check']}</Text>
          <ActionButton
            title="Create a free account"
            variant="accent"
            onPress={() => promptSignIn({ mode: 'signup', reason: 'fact-check' })}
          />
          <ActionButton
            title="I already have an account"
            variant="outline"
            onPress={() => promptSignIn({ mode: 'login', reason: 'fact-check' })}
          />
        </Panel>
      ) : fc.error ? (
        <Notice tone="danger">{fc.error.message}</Notice>
      ) : null}

      <Text variant="muted">
        Tools we use: Google Fact Check Tools, Gemini with Google Search, GDELT, Wikipedia and RDAP.
      </Text>
    </TabScreen>
  );
}
