import type { Metadata } from 'next';
import { BRAND_NAME, FC_DISCLAIMER, FC_TOOL_LABELS, FC_VERDICT_LABELS } from '@prapp/shared';
import {
  VERDICT_COLORS,
  VERDICT_ICONS,
  VERDICT_MEANINGS,
} from '@/components/fact-check/verdict-style';
import { Icon } from '@/components/icon';
import { Badge, Page, PageHeader } from '@/components/ui';
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-hairline pb-3 font-display text-headline-sm text-ink">
      {children}
    </h2>
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
        <SectionTitle>Verdicts</SectionTitle>
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {VERDICT_MEANINGS.map(([v, what]) => (
            <div key={v} className="flex flex-col gap-1">
              <dt
                className="flex items-center gap-2 text-label-md"
                style={{ color: VERDICT_COLORS[v] }}
              >
                <Icon name={VERDICT_ICONS[v]} size={18} /> {FC_VERDICT_LABELS[v]}
              </dt>
              <dd className="text-body-md text-body">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="flex items-start gap-2 text-body-sm text-slate">
          <Icon name="verified_user" size={16} className="mt-0.5 text-brand" />
          We never show a verdict without evidence from an official source, a recognised
          fact-checker or a major news outlet.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Tools</SectionTitle>
        <dl className="flex flex-col divide-y divide-divider">
          {TOOLS.map(([name, what]) => (
            <div key={name} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-6">
              <dt className="text-label-md text-ink">{name}</dt>
              <dd className="text-body-md text-body">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="text-body-sm text-slate">
          Each report lists the steps that actually ran, for example:{' '}
          {Object.values(FC_TOOL_LABELS).slice(3, 6).join('; ')}.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Trusted sources</SectionTitle>
        <p className="text-body-md text-body">
          Tier 1: government and recognised fact-checkers. Tier 2: major news outlets.
        </p>
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {(sources ?? []).map((s) => (
            <li
              key={s.domain}
              className="flex items-center justify-between gap-3 border-b border-divider py-2"
            >
              <span className="truncate font-mono text-code text-ink">{s.domain}</span>
              <Badge variant={s.tier === 'tier1' ? 'verified' : 'neutral'}>
                {s.tier === 'tier1' ? 'Tier 1' : 'Tier 2'}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
      <p className="border-t border-hairline pt-5 text-body-sm text-slate">{FC_DISCLAIMER}</p>
    </Page>
  );
}
