import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight, Check, Info, Link as LinkIcon, ShieldCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import {
  FC_DISCLAIMER,
  FC_TOOL_LABELS,
  FC_VERDICT_LABELS,
  PIB_FACT_CHECK_NOTE,
  formatIST,
  type FactCheckReport,
  type FactCheckSourceView,
} from '@prapp/shared';
import { Badge, Eyebrow, Icon, Notice, SectionTitle, Text } from '@/components/ui';
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
 * Same content and order as the web report (LLD §11.4). Tools are named in plain text
 * (no Google/PIB logos, golden rule 9).
 */
export function ReportView({ report, reportUrl }: { report: FactCheckReport; reportUrl?: string }) {
  const verdict = report.verdict ?? 'unverified';
  const existing = report.claims.flatMap((c) => c.sources.filter((s) => s.isExistingFactCheck));
  const evidence = report.claims.flatMap((c) => c.sources.filter((s) => !s.isExistingFactCheck));
  const checked = report.toolRuns.filter((t) => t.status === 'ok');
  const open = (url: string) => void WebBrowser.openBrowserAsync(url);
  const VerdictIcon = VERDICT_ICONS[verdict];

  return (
    <View className="gap-7">
      <Text className="text-body-sm text-slate">
        Report <Text className="font-mono text-code text-ink">{report.reportId}</Text> · Checked{' '}
        {report.checkedAt ? formatIST(report.checkedAt) : '-'}
      </Text>

      <View className="gap-3">
        <Eyebrow>The claim</Eyebrow>
        {report.claims.map((c) => (
          <Text key={c.position} className="font-display text-headline-sm text-ink">
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

      <View
        accessibilityLabel={`Verdict: ${FC_VERDICT_LABELS[verdict]}`}
        className="gap-3 rounded-lg p-5"
        style={{ backgroundColor: VERDICT_TINTS[verdict] }}
      >
        <Text className="font-sans-semibold text-label-sm text-body">Our verdict</Text>
        <View className="flex-row items-center gap-2.5">
          <VerdictIcon size={24} color={VERDICT_COLORS[verdict]} />
          <Text
            className="font-display text-headline-md"
            style={{ color: VERDICT_COLORS[verdict] }}
          >
            {FC_VERDICT_LABELS[verdict]}
          </Text>
        </View>
        <Text className="text-body-sm text-body">
          Confidence:{' '}
          <Text className="font-sans-semibold text-body-sm capitalize text-body">
            {report.confidence ?? 'low'}
          </Text>
        </Text>
        {report.summary ? <Text className="text-body-lg text-ink">{report.summary}</Text> : null}
      </View>

      {existing.length ? (
        <View className="gap-3">
          <SectionTitle>Existing fact checks</SectionTitle>
          <View className="border-y border-rule">
            {existing.map((s, i) => (
              <Pressable
                key={s.url}
                onPress={() => open(s.url)}
                className={`flex-row flex-wrap items-center gap-2 py-3 active:bg-subtle ${i ? 'border-t border-divider' : ''}`}
              >
                <Text className="font-sans-semibold text-label-md text-ink">
                  {s.publisher ?? s.domain}
                </Text>
                {s.rating ? (
                  <Badge>
                    <Text>{s.rating}</Text>
                  </Badge>
                ) : null}
                <View className="ml-auto flex-row items-center gap-1">
                  <Text className="font-sans-semibold text-label-md text-brand">Read</Text>
                  <Icon as={ArrowUpRight} size={14} className="text-brand" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {evidence.length ? (
        <View className="gap-3">
          <SectionTitle>Evidence</SectionTitle>
          <View className="border-y border-rule">
            {evidence.map((s, i) => (
              <Pressable
                key={s.url}
                onPress={() => open(s.url)}
                className={`gap-2 py-3.5 active:bg-subtle ${i ? 'border-t border-divider' : ''}`}
              >
                <View className="flex-row items-start gap-1">
                  <Text className="flex-1 font-sans-semibold text-label-md text-ink">
                    {s.title ?? s.url}
                  </Text>
                  <Icon as={ArrowUpRight} size={14} className="mt-0.5 text-faint" />
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
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle>How we checked this</SectionTitle>
        <Text variant="muted">
          Each step ran on this report. The verdict comes from what these sources say, not from our
          opinion.
        </Text>
        <View>
          {checked.map((t, i) => (
            <View
              key={`${t.tool}-${i}`}
              className="flex-row items-start gap-2.5 border-b border-divider py-2.5"
            >
              <Icon as={Check} size={16} className="mt-0.5 text-verified" />
              <Text className="flex-1 text-body-sm text-body">
                {FC_TOOL_LABELS[t.tool] ?? t.tool}
              </Text>
            </View>
          ))}
        </View>
        {report.mode === 'reduced' ? (
          <Notice tone="warn">
            Reduced check: our AI tools were at capacity. Full check pending. This report will
            update.
          </Notice>
        ) : null}
      </View>

      {report.claims.some((c) => c.isGovernmentRelated) ? (
        <View className="flex-row gap-2 rounded-md bg-subtle p-4">
          <Icon as={Info} size={16} className="mt-0.5 text-ink" />
          <Text className="flex-1 text-body-sm text-ink">{PIB_FACT_CHECK_NOTE}</Text>
        </View>
      ) : null}

      <View className="gap-2 border-t border-rule pt-5">
        <Text variant="muted">{FC_DISCLAIMER}</Text>
        {reportUrl ? (
          <View className="flex-row items-center gap-2">
            <Icon as={ShieldCheck} size={14} className="text-slate" />
            <Text className="flex-1 text-body-sm text-slate">
              Verify this report at{' '}
              <Text className="font-mono text-code text-ink">{reportUrl}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
