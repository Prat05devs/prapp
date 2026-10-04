import {
  FC_DISCLAIMER,
  FC_TOOL_LABELS,
  FC_VERDICT_LABELS,
  PIB_FACT_CHECK_NOTE,
  formatIST,
  type FactCheckReport,
  type FactCheckSourceView,
} from '@prapp/shared';
import { Icon } from '@/components/icon';
import { Badge, Eyebrow, Notice, type BadgeTone } from '@/components/ui';
import { VERDICT_COLORS, VERDICT_ICONS, VERDICT_TINTS } from './verdict-style';

const TIER_LABEL = {
  tier1: 'Official / fact-checker',
  tier2: 'Major news outlet',
  unknown: 'Unrated source',
};

const TIER_TONE: Record<FactCheckSourceView['tier'], BadgeTone> = {
  tier1: 'verified',
  tier2: 'neutral',
  unknown: 'neutral',
};

const STANCE: Record<NonNullable<FactCheckSourceView['stance']>, [string, BadgeTone]> = {
  supports: ['Supports the claim', 'verified'],
  refutes: ['Contradicts the claim', 'danger'],
  context: ['Context', 'neutral'],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-headline-sm text-ink">{children}</h2>;
}

/**
 * The report, in the order of LLD §11.4. Shared by /r/[reportId] and the checker result.
 * Tools are named in plain text (no Google/PIB logos, golden rule 9).
 */
export function ReportView({ report, reportUrl }: { report: FactCheckReport; reportUrl: string }) {
  const verdict = report.verdict ?? 'unverified';
  const existing = report.claims.flatMap((c) => c.sources.filter((s) => s.isExistingFactCheck));
  const evidence = report.claims.flatMap((c) => c.sources.filter((s) => !s.isExistingFactCheck));
  const gov = report.claims.some((c) => c.isGovernmentRelated);
  const checked = report.toolRuns.filter((t) => t.status === 'ok');

  return (
    <article className="flex flex-col gap-8" lang={report.language ?? undefined}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-slate">
        <span>
          Report <span className="font-mono text-code text-ink">{report.reportId}</span>
        </span>
        <span aria-hidden>·</span>
        <span>Checked {report.checkedAt ? formatIST(report.checkedAt) : '-'}</span>
      </p>

      <div className="flex flex-col gap-3">
        <Eyebrow>The claim</Eyebrow>
        {report.claims.map((c) => (
          <blockquote
            key={c.position}
            className="font-display text-headline-sm text-ink sm:text-headline-md"
          >
            “{c.claimText}”
          </blockquote>
        ))}
        {report.inputUrl ? (
          <p className="flex items-start gap-2 rounded-md bg-subtle px-3 py-2 font-mono text-code break-all text-slate">
            <Icon name="link" size={16} className="mt-px" />
            <span>
              {report.inputUrl}
              {report.inputDomainAgeDays !== null
                ? ` · website registered ${report.inputDomainAgeDays} days ago`
                : ''}
            </span>
          </p>
        ) : null}
      </div>

      <section
        aria-label="Verdict"
        className="flex flex-col gap-3 rounded-lg p-5 sm:p-6"
        style={{ backgroundColor: VERDICT_TINTS[verdict] }}
      >
        <p className="text-label-sm text-body">Our verdict</p>
        <p
          className="flex items-center gap-2.5 font-display text-headline-md"
          style={{ color: VERDICT_COLORS[verdict] }}
        >
          <Icon name={VERDICT_ICONS[verdict]} size={26} />
          {FC_VERDICT_LABELS[verdict]}
        </p>
        <p className="text-body-sm text-body">
          Confidence: <span className="font-semibold capitalize">{report.confidence ?? 'low'}</span>
        </p>
        {report.summary ? <p className="text-body-lg text-ink">{report.summary}</p> : null}
      </section>

      {existing.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Existing fact checks</SectionTitle>
          <ul className="flex flex-col divide-y divide-divider border-y border-hairline">
            {existing.map((s) => (
              <li key={s.url} className="flex flex-wrap items-center gap-3 py-3">
                <span className="text-label-md text-ink">{s.publisher ?? s.domain}</span>
                {s.rating ? <Badge>{s.rating}</Badge> : null}
                <a
                  className="ml-auto inline-flex items-center gap-1 text-label-md text-brand hover:text-brand-deep"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read <Icon name="north_east" size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {evidence.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Evidence</SectionTitle>
          <ul className="flex flex-col divide-y divide-divider border-y border-hairline">
            {evidence.map((s) => (
              <li key={s.url} className="flex flex-col gap-2 py-3.5">
                <a
                  className="group inline-flex items-start gap-1 text-label-md text-ink hover:text-brand"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="break-words">{s.title ?? s.url}</span>
                  <Icon name="north_east" size={16} className="mt-0.5 text-faint" />
                </a>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-code text-slate">{s.domain}</span>
                  <Badge variant={TIER_TONE[s.tier]}>{TIER_LABEL[s.tier]}</Badge>
                  {s.stance ? (
                    <Badge variant={STANCE[s.stance][1]}>{STANCE[s.stance][0]}</Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionTitle>How we checked this</SectionTitle>
        <p className="text-body-sm text-slate">
          Each step ran on this report. The verdict comes from what these sources say, not from our
          opinion.
        </p>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {checked.map((t, i) => (
            <li
              key={`${t.tool}-${i}`}
              className="flex items-start gap-2.5 border-b border-divider py-2.5 text-body-sm text-body"
            >
              <Icon name="check" size={16} className="mt-0.5 text-verified" />
              <span className="flex-1">
                {FC_TOOL_LABELS[t.tool] ?? t.tool}
                {t.model && ['llm_judge', 'claim_extraction', 'ocr'].includes(t.tool) ? (
                  <span className="text-slate"> ({t.model})</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {report.mode === 'reduced' ? (
          <Notice tone="warn">
            Reduced check: our AI tools were at capacity. Full check pending. This report will
            update.
          </Notice>
        ) : null}
      </section>

      {gov ? (
        <Notice>
          <span className="flex items-start gap-2">
            <Icon name="info" size={16} className="mt-0.5" /> {PIB_FACT_CHECK_NOTE}
          </span>
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-hairline pt-5">
        <p className="text-body-sm text-slate">{FC_DISCLAIMER}</p>
        <p className="flex items-center gap-2 text-body-sm break-all text-slate">
          <Icon name="verified_user" size={16} /> Verify this report at{' '}
          <span className="font-mono text-code text-ink">{reportUrl}</span>
        </p>
      </div>
    </article>
  );
}
