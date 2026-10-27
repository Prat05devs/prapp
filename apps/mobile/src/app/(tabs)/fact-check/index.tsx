import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  ArrowRight,
  ClipboardPaste,
  Download,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquareText,
  QrCode,
  Search,
  Share2,
  Upload,
  X,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Share, Switch, TextInput, View } from 'react-native';
import { FC_SIGNED_IN_LIMIT_MESSAGE, FC_SLOW_MESSAGE, FC_TOOL_LABELS } from '@prapp/shared';
import { Enter, IndeterminateBar, PressableScale, ScanOrb } from '@/components/motion';
import { ReportView } from '@/components/report-view';
import { VERDICT_TONES } from '@/components/verdict-style';
import {
  ActionButton,
  Button,
  Group,
  Icon,
  Notice,
  Row,
  ScrollScreen,
  Section,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { useFactCheck } from '@/hooks/use-fact-check';
import { siteUrl } from '@/lib/env';
import { haptics } from '@/lib/haptics';
import { SIGN_IN_REASONS, promptSignIn } from '@/lib/sign-in-prompt';
import { COLORS } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';

type Mode = 'text' | 'url' | 'image';

const MODES: { value: Mode; label: string; icon: typeof ImageIcon }[] = [
  { value: 'text', label: 'Text', icon: MessageSquareText },
  { value: 'url', label: 'Link', icon: LinkIcon },
  { value: 'image', label: 'Screenshot', icon: ImageIcon },
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

/** The places a check looks, for the orbit while it runs (plain text, no logos: golden rule 9). */
const LOOKS: Record<Mode, string[]> = {
  text: ['Fact checks', 'Live news', 'Wikipedia', 'Your claim'],
  url: ['Fact checks', 'Live news', 'Domain age', 'The page'],
  image: ['Fact checks', 'Live news', 'Wikipedia', 'Your screenshot'],
};

/** Where every check looks, shown under the input. */
const WHERE_WE_LOOK = [
  'Published fact checks',
  'Live news',
  'Wikipedia',
  'Website age',
  'Hindi and other Indian languages',
];

/** The verdict lands with a haptic that matches it. */
const VERDICT_HAPTIC = {
  danger: haptics.error,
  warn: haptics.warning,
  verified: haptics.success,
  neutral: haptics.tap,
} as const;

/**
 * Fact check (wireframe in docs/MOBILE-UX.md): one screen in three states, input → checking →
 * report, with the main action in the bottom bar.
 */
export default function FactCheckScreen() {
  const fc = useFactCheck();
  const aiConsent = useAiConsent();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ text?: string; mode?: string }>();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Opened from home with a mode (and maybe pasted text): switch to it during render (React's
  // pattern for state that follows a prop); the effect below clears the params and focuses.
  const incoming = params.mode ? `${params.mode}|${params.text ?? ''}` : '';
  const [applied, setApplied] = useState('');
  if (incoming !== applied) {
    setApplied(incoming);
    if (incoming) {
      const next = MODES.some((m) => m.value === params.mode) ? (params.mode as Mode) : 'text';
      setMode(next);
      if (params.text && next === 'url') setUrl(params.text);
      else if (params.text) setText(params.text);
    }
  }
  useEffect(() => {
    if (!incoming) return;
    fc.reset();
    router.setParams({ mode: undefined, text: undefined });
    if (!incoming.startsWith('image')) setTimeout(() => inputRef.current?.focus(), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per hand-off from home
  }, [incoming]);

  const busy = fc.phase === 'submitting' || fc.phase === 'checking';
  const reportId = fc.report?.reportId;
  const reportUrl = reportId ? `${siteUrl()}/r/${reportId}` : '';
  const verdict = fc.phase === 'done' ? fc.report?.verdict : undefined;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (verdict !== undefined) VERDICT_HAPTIC[VERDICT_TONES[verdict ?? 'unverified']]();
  }, [verdict]);

  /** Every check starts here: nothing is sent until the user allows AI processing. */
  async function startCheck() {
    if (!(await aiConsent.ensure())) return;
    if (mode === 'text') await fc.checkText(text);
    else if (mode === 'url') await fc.checkUrl(url);
    else await fc.checkScreenshot();
  }

  async function paste() {
    const clip = (await Clipboard.getStringAsync().catch(() => '')).trim();
    if (!clip) return;
    if (mode === 'url') setUrl(clip);
    else setText(clip.slice(0, TEXT_MAX));
  }

  async function shareImage() {
    // Share image (LLD §11.4): download the PNG card and hand it to the share sheet.
    const file = await File.downloadFileAsync(
      `${reportUrl}/image.png`,
      new File(Paths.cache, `${reportId ?? 'report'}.png`),
      { idempotent: true },
    );
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png' });
  }

  async function sharePdf() {
    // The PDF report (LLD §11.4) carries a QR code back to the public report, so whoever
    // receives it can confirm it came from us.
    const file = await File.downloadFileAsync(
      `${reportUrl}/report.pdf`,
      new File(Paths.cache, `${reportId ?? 'report'}.pdf`),
      { idempotent: true },
    );
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  /** Links, images and PDFs only work for public reports: ask before making it public. */
  function whenPublic(action: () => void) {
    if (fc.report?.isPublic) return action();
    Alert.alert('Share this report?', 'Anyone with the link will be able to see it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Make public and share',
        onPress: () => void fc.setPublic(true).then(action, () => {}),
      },
    ]);
  }

  const shareLink = () =>
    whenPublic(() => void Share.share({ message: reportUrl, url: reportUrl }));

  if (fc.report && fc.phase === 'done') {
    return (
      <>
        <ScrollScreen
          key="report"
          header={{ title: 'Report' }}
          footer={
            <View className="flex-row gap-2">
              <ActionButton
                title="Check another"
                variant="outline"
                className="flex-1"
                onPress={fc.reset}
              />
              <ActionButton
                title="Share result"
                variant="accent"
                icon={Share2}
                className="flex-1"
                onPress={shareLink}
              />
            </View>
          }
        >
          <ReportView report={fc.report} reportUrl={reportUrl} />
          <ProofCard onDownload={() => whenPublic(() => void sharePdf().catch(() => {}))} />
          <Section
            title="Share"
            footer="Help someone check the full context. Share this result with its sources."
          >
            <Group>
              <Row
                label="Public link"
                subtitle="Anyone with the link can see this report"
                trailing={
                  <Switch
                    value={fc.report.isPublic}
                    onValueChange={(v) => void fc.setPublic(v)}
                    trackColor={{ true: COLORS.brand, false: COLORS.hairline }}
                    ios_backgroundColor={COLORS.hairline}
                    accessibilityLabel="Public link"
                  />
                }
              />
              <Row
                icon={ImageIcon}
                label="Share as image"
                disabled={!fc.report.isPublic}
                onPress={() => void shareImage().catch(() => {})}
              />
            </Group>
          </Section>
        </ScrollScreen>
      </>
    );
  }

  if (busy) {
    return (
      <>
        <ScrollScreen
          key="checking"
          header={{ title: 'Fact check' }}
          footer={<ActionButton title="Cancel" variant="outline" onPress={fc.reset} />}
        >
          <View className="items-center gap-2 pt-2">
            <ScanOrb sources={LOOKS[mode]} />
            <Text className="pt-2 font-display text-[24px] leading-8 text-ink">
              Checking this claim
            </Text>
            <Text className="text-center text-body-md text-body">
              Searching fact checks, live reports and official sources. This usually takes under a
              minute.
            </Text>
            <Elapsed />
          </View>
          <IndeterminateBar color={COLORS.brand} />
          <Section title="What we're checking">
            <Group>
              {STEPS[mode].map((tool) => (
                <Row key={tool} label={FC_TOOL_LABELS[tool] ?? tool} />
              ))}
            </Group>
          </Section>
        </ScrollScreen>
      </>
    );
  }

  const empty = mode === 'text' ? !text.trim() : mode === 'url' ? !url.trim() : false;

  return (
    <>
      <ScrollScreen
        key="input"
        header={{
          title: 'Fact check',
          lede: 'Paste what you received. We check it against fact checkers, news and official sources.',
        }}
        footer={
          <ActionButton
            title={mode === 'image' ? 'Upload screenshot' : 'Check this claim'}
            variant="accent"
            icon={mode === 'image' ? Upload : ArrowRight}
            disabled={empty}
            onPress={() => void startCheck()}
          />
        }
      >
        <View className="gap-3">
          <SegmentedControl value={mode} onChange={setMode} options={MODES} />

          {mode === 'image' ? (
            <PressableScale
              accessibilityRole="button"
              scaleTo={0.98}
              haptic="tap"
              onPress={() => void startCheck()}
              className="items-center gap-3 rounded-2xl border border-dashed border-input bg-paper px-6 py-12 active:bg-subtle"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-elevated">
                <Icon as={Upload} size={24} className="text-ink" />
              </View>
              <View className="items-center gap-1">
                <Text className="font-sans-semibold text-[16px] text-ink">Upload screenshot</Text>
                <Text className="text-center text-body-sm text-slate">
                  We read the text in it. JPG, PNG or WebP.
                </Text>
              </View>
            </PressableScale>
          ) : (
            <View
              className={
                focused
                  ? 'overflow-hidden rounded-2xl border-[1.5px] border-brand bg-paper'
                  : 'overflow-hidden rounded-2xl border-[1.5px] border-hairline bg-paper'
              }
            >
              <TextInput
                ref={inputRef}
                value={mode === 'text' ? text : url}
                onChangeText={mode === 'text' ? setText : setUrl}
                placeholder={
                  mode === 'text'
                    ? 'Paste the message, link or claim you want to check. English, Hindi and other Indian languages work.'
                    : 'Paste a link to a post, article or video'
                }
                placeholderTextColor={COLORS.faint}
                multiline={mode === 'text'}
                maxLength={mode === 'text' ? TEXT_MAX : undefined}
                autoCapitalize={mode === 'url' ? 'none' : 'sentences'}
                autoCorrect={mode === 'text'}
                keyboardType={mode === 'url' ? 'url' : 'default'}
                textAlignVertical="top"
                accessibilityLabel={mode === 'text' ? 'Message to check' : 'Link to check'}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={
                  mode === 'text'
                    ? 'min-h-48 px-4 pb-3 pt-4 font-sans text-body-md text-ink'
                    : 'h-14 px-4 font-sans text-body-md text-ink'
                }
              />
              <View className="flex-row items-center justify-between border-t border-divider py-1 pl-1 pr-4">
                {(mode === 'text' ? text : url) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => (mode === 'text' ? setText('') : setUrl(''))}
                  >
                    <Icon as={X} size={16} />
                    <Text>Clear</Text>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onPress={() => void paste()}>
                    <Icon as={ClipboardPaste} size={16} />
                    <Text>Paste</Text>
                  </Button>
                )}
                {mode === 'text' ? (
                  <Text className="text-label-sm tabular-nums text-slate">
                    {`${text.length.toLocaleString('en-IN')} / ${TEXT_MAX.toLocaleString('en-IN')}`}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          <Text className="px-1 text-label-sm text-slate">
            Every verdict comes with its sources.
          </Text>
        </View>

        <Section title="Where we look">
          <View className="flex-row flex-wrap gap-2">
            {WHERE_WE_LOOK.map((label, i) => (
              <Enter key={label} index={i + 2}>
                <View className="flex-row items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-2">
                  <View className="h-1.5 w-1.5 rounded-full bg-brand" />
                  <Text className="text-label-sm text-ink">{label}</Text>
                </View>
              </Enter>
            ))}
          </View>
        </Section>

        {fc.phase === 'slow' ? (
          <Notice title="This check is taking longer than usual">{FC_SLOW_MESSAGE}</Notice>
        ) : null}
        {fc.error?.code === 'fact_check_limit_reached' && !session ? (
          <View className="gap-3 rounded-lg bg-subtle p-4">
            <Text className="font-display text-headline-sm text-ink">Keep checking for free</Text>
            <Text className="text-body-md text-body">{SIGN_IN_REASONS['fact-check']}</Text>
            <ActionButton
              title="Create a free account"
              onPress={() => promptSignIn({ mode: 'signup', reason: 'fact-check' })}
            />
            <ActionButton
              title="I already have an account"
              variant="outline"
              onPress={() => promptSignIn({ mode: 'login', reason: 'fact-check' })}
            />
          </View>
        ) : fc.error ? (
          <Notice tone="danger">
            {fc.error.code === 'fact_check_limit_reached'
              ? FC_SIGNED_IN_LIMIT_MESSAGE
              : fc.error.message}
          </Notice>
        ) : null}

        <Group>
          <Row
            icon={FileText}
            label="PDF report with a QR code"
            subtitle="Share proof, not just an opinion"
            onPress={() => router.push('/how-we-check')}
          />
          <Row
            icon={Search}
            label="How we check"
            subtitle="Verdicts, sources and tools"
            onPress={() => router.push('/how-we-check')}
          />
        </Group>
      </ScrollScreen>
    </>
  );
}

/** Time since the check started, so a wait feels measured rather than stuck. */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Text
      accessibilityLabel={`${seconds} seconds`}
      className="font-mono text-code tabular-nums text-slate"
    >
      {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
    </Text>
  );
}

/** The report's PDF: the one dark card on the report, since it's the thing people forward. */
function ProofCard({ onDownload }: { onDownload: () => void }) {
  return (
    <Enter delay={500}>
      <View className="flex-row items-center gap-4 rounded-[20px] bg-ink p-[18px]">
        <View className="h-[74px] w-[74px] items-center justify-center rounded-[10px] bg-paper">
          <Icon as={QrCode} size={44} className="text-ink" />
        </View>
        <View className="flex-1 gap-2">
          <Text className="font-display text-[19px] text-white">Forward the proof</Text>
          <Text className="text-[13px] leading-[19px] text-white/80">
            The PDF lists every source. Its QR code opens this report on our site, so anyone can
            check it is genuine.
          </Text>
          <PressableScale
            accessibilityRole="button"
            scaleTo={0.94}
            haptic="tap"
            onPress={onDownload}
            className="h-10 flex-row items-center gap-1.5 self-start rounded-full bg-paper px-3.5 active:bg-subtle"
          >
            <Icon as={Download} size={16} className="text-ink" />
            <Text className="font-sans-semibold text-[14px] text-ink">Download PDF</Text>
          </PressableScale>
        </View>
      </View>
    </Enter>
  );
}
