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
  buttonVariants,
  CheckRow,
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
        <div className="rounded-xl border border-hairline bg-paper p-4 text-left sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-label-md text-ink">What do you want to check?</h2>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="self-start sm:self-auto">
                {MODES.map((m) => (
                  <TabsTrigger key={m.mode} value={m.mode} className="group/trigger">
                    <Icon
                      name={m.icon}
                      size={16}
                      className="group-data-[state=active]/trigger:text-brand"
                    />
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-input bg-paper transition-colors focus-within:border-ink">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle text-slate">
                  <Icon name={file ? 'check' : 'upload'} size={20} />
                </span>
                <span className="text-label-md text-ink">
                  {file ? file.name : 'Choose a screenshot'}
                </span>
                <span className="text-body-sm text-slate">
                  {file ? 'Choose a different one' : 'JPG, PNG or WebP, up to 5 MB'}
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
          {mode === 'text' ? (
            <p className="tabular mt-1.5 text-right text-body-sm text-faint">
              {text.length.toLocaleString('en-IN')} / {TEXT_MAX.toLocaleString('en-IN')}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-slate">Every answer links to its sources.</p>
            <Button variant="accent" size="lg" disabled={busy} onClick={submit}>
              {busy ? (
                <>
                  <Icon name="progress_activity" className="animate-spin" /> Checking…
                </>
              ) : (
                <>
                  Check it <Icon name="arrow_forward" size={16} />
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
          className="flex flex-col gap-4 rounded-xl border border-hairline bg-paper p-5 text-left sm:p-6"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-label-md text-ink">
              <LiveDot /> Checking sources
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-elevated">
            <div className="h-full w-2/5 animate-indeterminate rounded-full bg-brand motion-reduce:animate-none" />
          </div>
          <p className="text-body-sm text-slate">This usually takes under a minute.</p>
          <div className="flex flex-col gap-1.5">
            <p className="text-label-sm text-ink">What we&apos;re running</p>
            <ul className="flex flex-col gap-1 text-body-sm text-body">
              {STEPS[mode].map((tool) => (
                <li key={tool} className="flex items-center gap-2.5">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-faint" />
                  {FC_TOOL_LABELS[tool]}
                </li>
              ))}
            </ul>
          </div>
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
        <Notice
          tone={fc.error.code === 'fact_check_limit_reached' && !signedIn ? 'info' : 'danger'}
        >
          <span role="alert">{fc.error.message}</span>
          {fc.error.code === 'fact_check_limit_reached' && !signedIn ? (
            <span className="mt-2 flex flex-wrap gap-2">
              <Link
                className={buttonVariants({ variant: 'accent', size: 'sm' })}
                href="/login?mode=signup&reason=fact-check&next=/fact-check"
              >
                Create a free account
              </Link>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href="/login?reason=fact-check&next=/fact-check"
              >
                Log in
              </Link>
            </span>
          ) : null}
        </Notice>
      ) : null}

      {showResult && fc.report ? (
        <div className="flex flex-col gap-6 rounded-xl border border-hairline bg-paper p-5 text-left sm:p-8">
          <ReportView report={fc.report} reportUrl={reportUrl} />
          <div className="flex flex-col gap-4 rounded-md bg-subtle p-4">
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
          <ul className="flex flex-col divide-y divide-divider border-y border-hairline">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                {h.verdict ? (
                  <Badge variant={VERDICT_TONES[h.verdict]}>{FC_VERDICT_LABELS[h.verdict]}</Badge>
                ) : (
                  <Badge>{h.status}</Badge>
                )}
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{h.preview}</span>
                <span className="tabular text-body-sm text-slate">{formatIST(h.createdAt)}</span>
                {h.status === 'done' && h.isPublic ? (
                  <Link
                    className="inline-flex items-center gap-1 text-label-sm text-brand hover:text-brand-deep"
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
