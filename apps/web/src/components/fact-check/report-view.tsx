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
import { VERDICT_COLORS, VERDICT_ICONS } from './verdict-style';

const TIER_LABEL = {
  tier1: 'Official / fact-checker',
  tier2: 'Major news outlet',
  unknown: 'Unrated source',
};

const TIER_TONE: Record<FactCheckSourceView['tier'], BadgeTone> = {
  tier1: 'emerald',
  tier2: 'neutral',
  unknown: 'neutral',
};

const STANCE: Record<NonNullable<FactCheckSourceView['stance']>, [string, BadgeTone]> = {
  supports: ['Supports the claim', 'emerald'],
  refutes: ['Contradicts the claim', 'danger'],
  context: ['Context', 'neutral'],
};

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Eyebrow accent>{index}</Eyebrow>
      <span className="text-xs text-faint">/</span>
      <h2 className="font-display text-headline-sm text-ink">{children}</h2>
    </div>
  );
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
  let section = 0;
  const next = () => String(++section).padStart(2, '0');

  return (
    <article className="flex flex-col gap-8" lang={report.language ?? undefined}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-code text-slate uppercase">
        <span className="text-ink">Report {report.reportId}</span>
        <span className="text-faint">·</span>
        <span>Checked {report.checkedAt ? formatIST(report.checkedAt) : '-'}</span>
      </div>

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
          <p className="flex items-start gap-2 rounded-lg border border-hairline bg-subtle px-3 py-2 font-mono text-code break-all text-slate">
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

      <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-headline-sm text-ink">Verdict</span>
            <span
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-label-md font-semibold tracking-wide text-white uppercase"
              style={{ backgroundColor: VERDICT_COLORS[verdict] }}
            >
              <Icon name={VERDICT_ICONS[verdict]} size={18} />
              {FC_VERDICT_LABELS[verdict]}
            </span>
          </div>
          <span className="flex flex-col items-end">
            <span className="font-display text-headline-sm text-ink capitalize">
              {report.confidence ?? 'low'}
            </span>
            <Eyebrow>Confidence</Eyebrow>
          </span>
        </div>
        {report.summary ? <p className="text-body-lg text-body">{report.summary}</p> : null}
      </div>

      {existing.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle index={next()}>Existing fact checks</SectionTitle>
          <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
            {existing.map((s) => (
              <li key={s.url} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-label-md text-ink">{s.publisher ?? s.domain}</span>
                {s.rating ? <Badge>{s.rating}</Badge> : null}
                <a
                  className="ml-auto inline-flex items-center gap-1 text-label-md text-emerald-strong hover:text-emerald-deep"
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
          <SectionTitle index={next()}>Evidence</SectionTitle>
          <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
            {evidence.map((s) => (
              <li key={s.url} className="flex flex-col gap-2 px-4 py-3.5">
                <a
                  className="group inline-flex items-start gap-1 text-label-md text-ink hover:text-emerald-strong"
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
        <SectionTitle index={next()}>How we checked this</SectionTitle>
        <ol className="grid gap-2 sm:grid-cols-2">
          {checked.map((t, i) => (
            <li
              key={`${t.tool}-${i}`}
              className="flex items-start gap-3 rounded-xl border border-hairline bg-canvas p-3.5"
            >
              <span className="mt-0.5 font-mono text-code text-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-body-sm text-body">
                {FC_TOOL_LABELS[t.tool] ?? t.tool}
                {t.model && ['llm_judge', 'claim_extraction', 'ocr'].includes(t.tool) ? (
                  <span className="font-mono text-code text-slate"> ({t.model})</span>
                ) : null}
              </span>
              <Icon name="check_circle" size={16} className="mt-0.5 text-emerald" />
            </li>
          ))}
        </ol>
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
        <p className="flex items-center gap-2 font-mono text-code break-all text-slate">
          <Icon name="verified_user" size={16} /> Verify this report: {reportUrl}
        </p>
      </div>
    </article>
  );
}
