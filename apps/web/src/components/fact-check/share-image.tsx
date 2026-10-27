import {
  BRAND_NAME,
  FC_VERDICT_LABELS,
  FC_VERDICT_RESULTS,
  formatIST,
  type FactCheckReport,
} from '@prapp/shared';
import { VERDICT_COLORS } from './verdict-style';

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const FOOTER = 'Read the full report and every source: scan the QR code';

/** One-sentence finding (VERBAL_SYSTEM.md §10 share card): the summary's first sentence. */
function finding(report: FactCheckReport): string {
  const verdict = report.verdict ?? 'unverified';
  const first = report.summary?.match(/^.*?[.!?।](\s|$)/)?.[0]?.trim() ?? report.summary?.trim();
  return clip(first || FC_VERDICT_RESULTS[verdict].headline, 170);
}

function sourceCount(report: FactCheckReport): number {
  return new Set(report.claims.flatMap((c) => c.sources.map((x) => x.url))).size;
}

function meta(report: FactCheckReport): string {
  const n = sourceCount(report);
  return `Checked ${report.checkedAt ? formatIST(report.checkedAt) : '-'} · ${n} linked source${n === 1 ? '' : 's'}`;
}

/** Every character drawn on the card, so the Google Fonts subset covers all of it. */
export function shareImageText(report: FactCheckReport): string {
  return [
    `${BRAND_NAME} fact-check`,
    FOOTER,
    'ClaimFinding',
    finding(report),
    meta(report),
    report.reportId,
    ...Object.values(FC_VERDICT_LABELS),
    ...report.claims.map((c) => c.claimText),
    report.inputText ?? '',
    ...report.claims.flatMap((c) =>
      c.sources.map((x) => `${x.domain} · ${x.title ?? x.publisher ?? ''}`),
    ),
    '“”…',
  ].join('');
}

/**
 * Satori element for the 1080×1350 share card (flexbox only), laid out as the VERBAL_SYSTEM.md
 * §10 share card: verdict, claim, one-sentence finding, check date, source count, report link.
 * Known limitation: satori does not shape Devanagari (matras can look misplaced); the web
 * report page and the app render Hindi correctly.
 */
export function buildShareElement(report: FactCheckReport, qr: string) {
  const verdict = report.verdict ?? 'unverified';
  const color = VERDICT_COLORS[verdict];
  const claim = report.claims[0]?.claimText ?? report.inputText ?? '';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fbfaf7',
        padding: 72,
        fontFamily: 'Noto, NotoDeva',
        color: '#111',
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>{BRAND_NAME} fact-check</div>
      <div
        style={{
          display: 'flex',
          marginTop: 48,
          alignSelf: 'flex-start',
          backgroundColor: color,
          color: '#fff',
          fontSize: 60,
          fontWeight: 700,
          padding: '14px 34px',
          borderRadius: 16,
        }}
      >
        {FC_VERDICT_LABELS[verdict]}
      </div>
      <div style={{ display: 'flex', fontSize: 30, color: '#555', marginTop: 48 }}>Claim</div>
      <div style={{ display: 'flex', fontSize: 46, lineHeight: 1.3, marginTop: 8 }}>
        “{clip(claim, 160)}”
      </div>
      <div style={{ display: 'flex', fontSize: 30, color: '#555', marginTop: 40 }}>Finding</div>
      <div style={{ display: 'flex', fontSize: 36, lineHeight: 1.35, marginTop: 8 }}>
        {finding(report)}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            fontSize: 28,
            color: '#555',
          }}
        >
          <div style={{ display: 'flex' }}>{meta(report)}</div>
          <div style={{ display: 'flex' }}>{FOOTER}</div>
          <div style={{ display: 'flex' }}>{report.reportId}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori needs <img> */}
        <img src={qr} width={200} height={200} alt="" style={{ flexShrink: 0 }} />
      </div>
    </div>
  );
}
