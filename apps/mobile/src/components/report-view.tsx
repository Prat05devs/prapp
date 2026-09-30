import * as WebBrowser from 'expo-web-browser';
import {
  ArrowUpRight,
  CircleCheck,
  Info,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react-native';
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
import { VERDICT_COLORS, VERDICT_ICONS } from './verdict-style';

const TIER_LABEL = {
  tier1: 'Official / fact-checker',
  tier2: 'Major news outlet',
  unknown: 'Unrated source',
};

const STANCE: Record<
  NonNullable<FactCheckSourceView['stance']>,
  [string, 'emerald' | 'danger' | 'neutral']
> = {
  supports: ['Supports the claim', 'emerald'],
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
  let section = 0;
  const next = () => String(++section).padStart(2, '0');

  return (
    <View className="gap-7">
      <Text className="font-mono text-code uppercase text-slate">
        <Text className="font-mono text-code text-ink">Report {report.reportId}</Text> · Checked{' '}
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
          <View className="flex-row gap-2 rounded-lg border border-hairline bg-subtle px-3 py-2">
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

      <View className="gap-4 rounded-2xl border border-hairline bg-subtle p-5">
        <View className="flex-row items-center justify-between gap-3">
          <View
            className="flex-row items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ backgroundColor: VERDICT_COLORS[verdict] }}
          >
            <Icon as={VERDICT_ICONS[verdict]} size={16} className="text-white" />
            <Text className="font-sans-semibold text-label-md uppercase tracking-wide text-white">
              {FC_VERDICT_LABELS[verdict]}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-display text-headline-sm capitalize text-ink">
              {report.confidence ?? 'low'}
            </Text>
            <Eyebrow>Confidence</Eyebrow>
          </View>
        </View>
        {report.summary ? <Text className="text-body-lg text-body">{report.summary}</Text> : null}
      </View>

      {existing.length ? (
        <View className="gap-3">
          <SectionTitle index={next()}>Existing fact checks</SectionTitle>
          <View className="overflow-hidden rounded-2xl border border-hairline">
            {existing.map((s, i) => (
              <Pressable
                key={s.url}
                onPress={() => open(s.url)}
                className={`flex-row flex-wrap items-center gap-2 px-4 py-3 active:bg-subtle ${i ? 'border-t border-divider' : ''}`}
              >
                <Text className="font-sans-medium text-label-md text-ink">
                  {s.publisher ?? s.domain}
                </Text>
                {s.rating ? (
                  <Badge>
                    <Text>{s.rating}</Text>
                  </Badge>
                ) : null}
                <View className="ml-auto flex-row items-center gap-1">
                  <Text className="font-sans-medium text-label-md text-emerald-strong">Read</Text>
                  <Icon as={ArrowUpRight} size={14} className="text-emerald-strong" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {evidence.length ? (
        <View className="gap-3">
          <SectionTitle index={next()}>Evidence</SectionTitle>
          <View className="overflow-hidden rounded-2xl border border-hairline">
            {evidence.map((s, i) => (
              <Pressable
                key={s.url}
                onPress={() => open(s.url)}
                className={`gap-2 px-4 py-3.5 active:bg-subtle ${i ? 'border-t border-divider' : ''}`}
              >
                <View className="flex-row items-start gap-1">
                  <Text className="flex-1 font-sans-medium text-label-md text-ink">
                    {s.title ?? s.url}
                  </Text>
                  <Icon as={ArrowUpRight} size={14} className="mt-0.5 text-faint" />
                </View>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="font-mono text-code text-slate">{s.domain}</Text>
                  <Badge variant={s.tier === 'tier1' ? 'emerald' : 'neutral'}>
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
        <SectionTitle index={next()}>How we checked this</SectionTitle>
        <View className="gap-2">
          {checked.map((t, i) => (
            <View
              key={`${t.tool}-${i}`}
              className="flex-row items-start gap-3 rounded-xl border border-hairline p-3.5"
            >
              <Text className="font-mono text-code text-faint">
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text className="flex-1 text-body-sm text-body">
                {FC_TOOL_LABELS[t.tool] ?? t.tool}
              </Text>
              <Icon as={CircleCheck} size={16} className="text-emerald" />
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
        <View className="flex-row gap-2 rounded-xl border border-hairline bg-subtle p-4">
          <Icon as={Info} size={16} className="mt-0.5 text-ink" />
          <Text className="flex-1 text-body-sm text-ink">{PIB_FACT_CHECK_NOTE}</Text>
        </View>
      ) : null}

      <View className="gap-2 border-t border-hairline pt-5">
        <Text variant="muted">{FC_DISCLAIMER}</Text>
        {reportUrl ? (
          <View className="flex-row items-center gap-2">
            <Icon as={ShieldCheck} size={14} className="text-slate" />
            <Text className="flex-1 font-mono text-code text-slate">
              Verify this report: {reportUrl}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
