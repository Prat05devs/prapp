import type { Metadata } from 'next';
import {
  BRAND_NAME,
  FC_DISCLAIMER,
  FC_TOOL_LABELS,
  FC_VERDICT_LABELS,
  type FcVerdict,
} from '@prapp/shared';
import { VERDICT_ICONS, VERDICT_TONES } from '@/components/fact-check/verdict-style';
import { Icon } from '@/components/icon';
import { Badge, Eyebrow, Page, PageHeader } from '@/components/ui';
import { createServerSupabase } from '@/server/supabase/server';

export const metadata: Metadata = { title: `How we check · ${BRAND_NAME}` };

const TOOLS = [
  ['Google Fact Check Tools', 'Finds reviews already published by recognised fact-checkers.'],
  [
    'Gemini with Google Search',
    'Finds live reporting about the claim. Only the sources it cites are kept, and every link is checked.',
  ],
  ['GDELT', 'Shows which news outlets covered the story in the last 30 days.'],
  ['Wikipedia', 'Background on the people, places and organisations mentioned.'],
  ['RDAP', 'How old the website behind a link is (brand-new sites are a warning sign).'],
];

const VERDICTS: [FcVerdict, string][] = [
  ['likely_false', 'Reliable sources contradict the claim.'],
  ['misleading', 'Partly true, missing context, or old media presented as new.'],
  ['likely_true', 'Reliable sources confirm the claim.'],
  ['unverified', 'We did not find enough reliable evidence either way.'],
];

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Eyebrow accent>{index}</Eyebrow>
      <span className="text-xs text-faint">/</span>
      <h2 className="font-display text-headline-sm text-ink">{children}</h2>
    </div>
  );
}

export default async function MethodologyPage() {
  const db = await createServerSupabase();
  const { data: sources } = await db
    .from('trusted_sources')
    .select('domain, tier, category')
    .order('tier')
    .order('domain');
  return (
    <Page width="lg">
      <PageHeader
        eyebrow="Methodology"
        title="How we check"
        lede={`${BRAND_NAME} does not give its own opinion. Every report shows the sources we found and the tools we used, so you can verify the result yourself.`}
      />

      <section className="flex flex-col gap-4">
        <SectionTitle index="01">Verdicts</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {VERDICTS.map(([v, what]) => (
            <li key={v} className="flex flex-col gap-3 rounded-2xl border border-hairline p-5">
              <Badge variant={VERDICT_TONES[v]} className="self-start">
                <Icon name={VERDICT_ICONS[v]} size={14} /> {FC_VERDICT_LABELS[v]}
              </Badge>
              <p className="text-body-md text-body">{what}</p>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-body-sm text-slate">
          <Icon name="verified_user" size={16} className="mt-0.5 text-emerald-strong" />
          We never show a verdict without evidence from an official source, a recognised
          fact-checker or a major news outlet.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle index="02">Tools</SectionTitle>
        <ol className="grid gap-3 md:grid-cols-2">
          {TOOLS.map(([name, what], i) => (
            <li key={name} className="flex flex-col gap-2 rounded-2xl border border-hairline p-5">
              <span className="flex items-center gap-2 font-mono text-label-sm text-slate uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                Tool {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-label-md text-ink">{name}</span>
              <span className="text-body-sm text-body">{what}</span>
            </li>
          ))}
        </ol>
        <p className="text-body-sm text-slate">
          Each report lists the steps that actually ran, for example:{' '}
          {Object.values(FC_TOOL_LABELS).slice(3, 6).join('; ')}.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle index="03">Trusted sources</SectionTitle>
        <p className="text-body-md text-body">
          Tier 1: government and recognised fact-checkers. Tier 2: major news outlets.
        </p>
        <ul className="grid gap-x-6 rounded-2xl border border-hairline p-2 sm:grid-cols-2 lg:grid-cols-3">
          {(sources ?? []).map((s) => (
            <li
              key={s.domain}
              className="flex items-center justify-between gap-3 border-b border-divider px-3 py-2 last:border-0"
            >
              <span className="truncate font-mono text-code text-ink">{s.domain}</span>
              <Badge variant={s.tier === 'tier1' ? 'emerald' : 'neutral'}>{s.tier}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <p className="border-t border-hairline pt-5 text-body-sm text-slate">{FC_DISCLAIMER}</p>
    </Page>
  );
}
