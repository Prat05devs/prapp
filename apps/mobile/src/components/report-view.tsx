import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight, CircleCheck, Link as LinkIcon } from 'lucide-react-native';
import { View } from 'react-native';
import {
  FC_CORRECTION_PROMPT,
  FC_DISCLAIMER,
  FC_VERDICT_RESULTS,
  FC_TOOL_LABELS,
  FC_VERDICT_LABELS,
  PIB_FACT_CHECK_NOTE,
  formatIST,
  type FactCheckReport,
  type FactCheckSourceView,
} from '@prapp/shared';
import { Pop, PressableScale, SegmentBar } from '@/components/motion';
import { Badge, Group, Icon, Notice, Row, Section, Text } from '@/components/ui';
import { siteUrl } from '@/lib/env';
import { COLORS } from '@/lib/theme';
import { VERDICT_COLORS, VERDICT_ICONS, VERDICT_TINTS } from './verdict-style';

const TIER_LABEL = {
  tier1: 'Official / fact-checker',
  tier2: 'Major news outlet',
  unknown: 'Unrated source',
};

const STANCE: Record<
  NonNullable<FactCheckSourceView['stance']>,
  [string, 'verified' | 'danger' | 'neutral']
> = {
  supports: ['Supports the claim', 'verified'],
  refutes: ['Contradicts the claim', 'danger'],
  context: ['Context', 'neutral'],
};

/**
 * Same content as the web report (LLD §11.4), laid out for a phone: the verdict first, then the
 * claim, sources and tools as grouped lists. Tools are named in plain text (no Google/PIB logos,
 * golden rule 9).
 */
export function ReportView({ report, reportUrl }: { report: FactCheckReport; reportUrl?: string }) {
  const verdict = report.verdict ?? 'unverified';
  const existing = report.claims.flatMap((c) => c.sources.filter((s) => s.isExistingFactCheck));
  const evidence = report.claims.flatMap((c) => c.sources.filter((s) => !s.isExistingFactCheck));
  const checked = report.toolRuns.filter((t) => t.status === 'ok');
  const open = (url: string) => void WebBrowser.openBrowserAsync(url);
  const VerdictIcon = VERDICT_ICONS[verdict];
  const stances = report.claims.flatMap((c) => c.sources.map((s) => s.stance));
  const count = (stance: FactCheckSourceView['stance']) =>
    stances.filter((s) => s === stance).length;
  const agreement = [
    { key: 'refutes', label: 'contradict', count: count('refutes'), color: COLORS.danger },
    { key: 'context', label: 'give context', count: count('context'), color: COLORS.faint },
    { key: 'supports', label: 'support', count: count('supports'), color: COLORS.verified },
  ];

  return (
    <View className="gap-7">
      {/* The verdict lands: the panel settles in, then its icon pops (docs/DESIGN.md, Motion). */}
      <Pop from={0.94} bounce={16}>
        <View
          accessibilityLabel={`Verdict: ${FC_VERDICT_LABELS[verdict]}`}
          className="gap-3 rounded-[22px] p-5"
          style={{ backgroundColor: VERDICT_TINTS[verdict] }}
        >
          <Text className="font-sans-semibold text-label-sm text-body">Our verdict</Text>
          <View className="flex-row items-center gap-3">
            <Pop delay={220} bounce={9}>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: VERDICT_COLORS[verdict] }}
              >
                <VerdictIcon size={26} color={COLORS.paper} />
              </View>
            </Pop>
            <Text
              className="flex-1 font-display-bold text-headline-md"
              style={{ color: VERDICT_COLORS[verdict] }}
            >
              {FC_VERDICT_LABELS[verdict]}
            </Text>
          </View>
          <Text className="text-body-md text-body">
            <Text className="font-sans-semibold text-body-md text-ink">
              {FC_VERDICT_RESULTS[verdict].headline}
            </Text>{' '}
            {FC_VERDICT_RESULTS[verdict].detail}
          </Text>
          {report.summary ? <Text className="text-body-lg text-ink">{report.summary}</Text> : null}
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-sm bg-paper/70 px-2.5 py-1">
              <Text className="text-body-sm text-body">
                Confidence:{' '}
                <Text className="font-sans-semibold text-body-sm capitalize text-ink">
                  {report.confidence ?? 'low'}
                </Text>
              </Text>
            </View>
            {stances.length ? (
              <View className="rounded-sm bg-paper/70 px-2.5 py-1">
                <Text className="font-sans-semibold text-body-sm tabular-nums text-ink">
                  {`${stances.length} source${stances.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pop>

      {agreement.some((a) => a.count) ? (
        <Section title="What the sources say">
          <SegmentBar segments={agreement} />
          <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 px-0.5 pt-1">
            {agreement.map((a) => (
              <View key={a.key} className="flex-row items-center gap-1.5">
                <View
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={
                    a.count
                      ? { backgroundColor: a.color }
                      : { borderWidth: 1, borderColor: COLORS.hairline }
                  }
                />
                <Text className={a.count ? 'text-label-sm text-body' : 'text-label-sm text-slate'}>
                  {`${a.count} ${a.label}`}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={report.claims.length > 1 ? 'The claims' : 'The claim'}>
        <View className="gap-3 rounded-lg border border-hairline bg-paper p-4">
          {report.claims.map((c) => (
            <Text key={c.position} className="font-display text-[18px] leading-[26px] text-ink">
              “{c.claimText}”
            </Text>
          ))}
          {report.inputUrl ? (
            <View className="flex-row gap-2 rounded-md bg-subtle px-3 py-2">
              <Icon as={LinkIcon} size={14} className="mt-0.5 text-slate" />
              <Text className="flex-1 font-mono text-code text-slate">
                {report.inputUrl}
                {report.inputDomainAgeDays !== null
                  ? ` · website registered ${report.inputDomainAgeDays} days ago`
                  : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </Section>

      {existing.length ? (
        <Section title="Existing fact checks">
          <Group>
            {existing.map((s) => (
              <Row
                key={s.url}
                label={s.publisher ?? s.domain}
                subtitle={s.rating ? `Rated: ${s.rating}` : undefined}
                external
                onPress={() => open(s.url)}
              />
            ))}
          </Group>
        </Section>
      ) : null}

      {evidence.length ? (
        <Section title="Evidence">
          <Group>
            {evidence.map((s) => (
              <PressableScale
                key={s.url}
                accessibilityRole="link"
                scaleTo={0.985}
                onPress={() => open(s.url)}
                className="gap-2 px-4 py-3.5 active:bg-subtle"
              >
                <View className="flex-row items-start gap-2">
                  <Text
                    numberOfLines={3}
                    className="flex-1 font-sans-medium text-[16px] leading-[22px] text-ink"
                  >
                    {s.title ?? s.url}
                  </Text>
                  <Icon as={ArrowUpRight} size={18} className="mt-0.5 text-faint" />
                </View>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="font-mono text-code text-slate">{s.domain}</Text>
                  <Badge variant={s.tier === 'tier1' ? 'verified' : 'neutral'}>
                    <Text>{TIER_LABEL[s.tier]}</Text>
                  </Badge>
                  {s.stance ? (
                    <Badge variant={STANCE[s.stance][1]}>
                      <Text>{STANCE[s.stance][0]}</Text>
                    </Badge>
                  ) : null}
                </View>
              </PressableScale>
            ))}
          </Group>
        </Section>
      ) : null}

      <Section
        title="How we checked this"
        footer="Each step ran on this report. The verdict comes from what these sources say, not from our opinion."
      >
        <Group>
          {checked.map((t, i) => (
            <Row
              key={`${t.tool}-${i}`}
              icon={CircleCheck}
              iconColor={COLORS.verified}
              label={FC_TOOL_LABELS[t.tool] ?? t.tool}
            />
          ))}
        </Group>
      </Section>

      {report.mode === 'reduced' ? (
        <Notice tone="warn">
          Reduced check: our AI tools were at capacity. Full check pending. This report will update.
        </Notice>
      ) : null}

      {report.claims.some((c) => c.isGovernmentRelated) ? (
        <Notice>{PIB_FACT_CHECK_NOTE}</Notice>
      ) : null}

      <View className="gap-2 px-1">
        <Text className="text-label-sm text-slate">{FC_DISCLAIMER}</Text>
        <Text className="text-label-sm text-slate">
          {FC_CORRECTION_PROMPT}{' '}
          <Text
            accessibilityRole="link"
            className="font-sans-semibold text-label-sm text-brand"
            onPress={() => open(`${siteUrl()}/support`)}
          >
            Send a correction
          </Text>
        </Text>
        <Text className="text-label-sm text-slate">
          Report <Text className="font-mono text-code text-body">{report.reportId}</Text> · Checked{' '}
          {report.checkedAt ? formatIST(report.checkedAt) : '-'}
        </Text>
        {reportUrl ? (
          <Text className="text-label-sm text-slate">
            Verify this report at <Text className="font-mono text-code text-body">{reportUrl}</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}
