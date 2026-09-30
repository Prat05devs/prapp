'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FactCheckHistoryItem } from '@prapp/shared';
import { FC_TOOL_LABELS, FC_VERDICT_LABELS, formatIST } from '@prapp/shared';
import { ReportView } from '@/components/fact-check/report-view';
import { VERDICT_TONES } from '@/components/fact-check/verdict-style';
import { Icon, type IconName } from '@/components/icon';
import {
  Badge,
  Button,
  CheckRow,
  Eyebrow,
  LiveDot,
  Notice,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useFactCheck, type CheckInput } from '@/hooks/use-fact-check';
import { ShareBar } from '../r/[reportId]/share-bar';

type Mode = 'text' | 'url' | 'image';

const MODES: { mode: Mode; label: string; icon: IconName }[] = [
  { mode: 'text', label: 'Text', icon: 'chat' },
  { mode: 'url', label: 'Link', icon: 'link' },
  { mode: 'image', label: 'Screenshot', icon: 'image' },
];

const TEXT_MAX = 10_000;

/** The steps the pipeline runs for each kind of input (LLD §11.2), shown while it works. */
const STEPS: Record<Mode, string[]> = {
  text: ['claim_extraction', 'google_fact_check', 'gemini_search', 'gdelt', 'llm_judge'],
  url: ['fetch_url', 'rdap', 'claim_extraction', 'google_fact_check', 'gemini_search', 'llm_judge'],
  image: ['ocr', 'claim_extraction', 'google_fact_check', 'gemini_search', 'llm_judge'],
};

export function FactChecker({
  siteUrl,
  signedIn,
  history,
  compact = false,
}: {
  siteUrl: string;
  signedIn: boolean;
  history: FactCheckHistoryItem[];
  compact?: boolean;
}) {
  const fc = useFactCheck();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const busy = fc.phase === 'submitting' || fc.phase === 'checking';

  function submit() {
    const input: CheckInput | null =
      mode === 'text'
        ? { type: 'text', text }
        : mode === 'url'
          ? { type: 'url', url }
          : file
            ? { type: 'image', file }
            : null;
    if (input) void fc.check(input);
  }

  const reportUrl = fc.report ? `${siteUrl}/r/${fc.report.reportId}` : '';
  const showResult = fc.report && fc.phase === 'done';

  return (
    <div className="flex flex-col gap-6">
      {!showResult ? (
        <div className="rounded-2xl border border-hairline bg-canvas p-4 text-left shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Eyebrow accent>01</Eyebrow>
                <span className="text-xs text-faint">/</span>
                <h2 className="font-display text-headline-sm text-ink">Paste the forward</h2>
              </div>
              <p className="text-body-sm text-slate">A message, a link or a screenshot.</p>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="self-start sm:self-auto">
                {MODES.map((m) => (
                  <TabsTrigger key={m.mode} value={m.mode} className="group/trigger">
                    <Icon
                      name={m.icon}
                      size={16}
                      className="group-data-[state=active]/trigger:text-emerald-strong"
                    />
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-hairline bg-subtle transition-colors focus-within:border-ink focus-within:bg-canvas">
            <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2 font-mono text-[11px] text-faint uppercase">
              <span>{mode === 'text' ? 'Message' : mode === 'url' ? 'Link' : 'Screenshot'}</span>
              <span className="truncate text-slate">
                {mode === 'text'
                  ? `${text.length.toLocaleString('en-IN')} / ${TEXT_MAX.toLocaleString('en-IN')}`
                  : mode === 'image'
                    ? 'JPG, PNG or WebP'
                    : 'https://'}
              </span>
            </div>
            {mode === 'text' ? (
              <textarea
                aria-label="Message to check"
                className="block min-h-36 w-full resize-y bg-transparent p-4 text-body-md leading-relaxed text-ink outline-none placeholder:text-faint"
                placeholder="Paste the message or forward you want to check"
                value={text}
                maxLength={TEXT_MAX}
                onChange={(e) => setText(e.target.value)}
              />
            ) : mode === 'url' ? (
              <input
                aria-label="Link to check"
                type="url"
                className="block h-14 w-full bg-transparent px-4 text-body-md text-ink outline-none placeholder:text-faint"
                value={url}
                placeholder="Paste a link to a post, article or video"
                onChange={(e) => setUrl(e.target.value)}
              />
            ) : (
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-slate">
                  <Icon name={file ? 'check' : 'upload'} size={20} />
                </span>
                <span className="text-label-md text-ink">
                  {file ? file.name : 'Choose a screenshot'}
                </span>
                <span className="text-body-sm text-slate">
                  {file ? 'Tap to choose a different one' : 'Up to 5 MB'}
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 font-mono text-code text-slate">
              <Icon name="verified_user" size={16} className="text-emerald-strong" />
              Every answer lists its sources
            </p>
            <Button variant="accent" size="lg" disabled={busy} onClick={submit}>
              {busy ? (
                <>
                  <Icon name="progress_activity" className="animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <Icon name="bolt" /> Check it <Icon name="arrow_forward" size={16} />
                </>
              )}
            </Button>
          </div>
          {!compact ? (
            <p className="mt-4 text-body-sm text-slate">
              Free. We check with public sources and tell you which tools we used.{' '}
              <Link className="text-ink underline underline-offset-2" href="/methodology">
                How it works
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {fc.phase === 'checking' || fc.phase === 'submitting' ? (
        <div
          className="flex flex-col gap-4 rounded-2xl border border-hairline bg-canvas p-5 text-left sm:p-6"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-label-md text-ink">
              <LiveDot /> Checking sources
            </span>
            <Badge variant="emerald">Running</Badge>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
            <div className="h-full w-2/5 animate-indeterminate rounded-full bg-emerald motion-reduce:animate-none" />
          </div>
          <p className="text-body-sm text-slate">This usually takes under a minute.</p>
          <ol className="flex flex-col gap-2">
            {STEPS[mode].map((tool, i) => (
              <li
                key={tool}
                className="flex items-center gap-3 rounded-lg border border-divider bg-subtle px-3 py-2 text-body-sm text-body"
              >
                <span className="font-mono text-code text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {FC_TOOL_LABELS[tool]}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {fc.phase === 'slow' ? (
        <Notice title="This is taking longer than usual">
          <span aria-live="polite">
            Your report will be ready shortly{signedIn ? ' in your history below' : ''}.
          </span>
        </Notice>
      ) : null}

      {fc.error ? (
        <Notice tone="danger">
          <span role="alert">{fc.error.message}</span>
          {fc.error.code === 'fact_check_limit_reached' && !signedIn ? (
            <Link
              className="text-label-md underline underline-offset-2"
              href="/login?next=/fact-check"
            >
              Sign in for more checks
            </Link>
          ) : null}
        </Notice>
      ) : null}

      {showResult && fc.report ? (
        <div className="flex flex-col gap-6 rounded-2xl border border-hairline bg-canvas p-5 text-left shadow-sm sm:p-8">
          <ReportView report={fc.report} reportUrl={reportUrl} />
          <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-subtle p-4">
            <CheckRow checked={fc.report.isPublic} onChange={(v) => void fc.setPublic(v)}>
              Anyone with the link can see this report
            </CheckRow>
            {fc.report.isPublic ? <ShareBar url={reportUrl} title="Fact check" /> : null}
          </div>
          <Button variant="outline" className="self-start" onClick={fc.reset}>
            <Icon name="arrow_back" /> Check something else
          </Button>
        </div>
      ) : null}

      {signedIn && history.length && !compact ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="history" className="text-slate" />
            <h2 className="font-display text-headline-sm text-ink">Your checks</h2>
          </div>
          <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                {h.verdict ? (
                  <Badge variant={VERDICT_TONES[h.verdict]}>{FC_VERDICT_LABELS[h.verdict]}</Badge>
                ) : (
                  <Badge>{h.status}</Badge>
                )}
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{h.preview}</span>
                <span className="font-mono text-code text-faint">{formatIST(h.createdAt)}</span>
                {h.status === 'done' && h.isPublic ? (
                  <Link
                    className="inline-flex items-center gap-1 text-label-sm text-emerald-strong hover:text-emerald-deep"
                    href={`/r/${h.reportId}`}
                  >
                    Open <Icon name="north_east" size={14} />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
