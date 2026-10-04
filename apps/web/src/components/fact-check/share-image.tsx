import { BRAND_NAME, FC_VERDICT_LABELS, type FactCheckReport } from '@prapp/shared';
import { VERDICT_COLORS } from './verdict-style';

export { VERDICT_COLORS };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const FOOTER = 'AI-assisted analysis of public sources · verify at the QR link';

/** Every character drawn on the card, so the Google Fonts subset covers all of it. */
export function shareImageText(report: FactCheckReport): string {
  return [
    `${BRAND_NAME} fact check`,
    FOOTER,
    'Sources',
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
 * Satori element for the 1080×1350 share card (flexbox only).
 * Known limitation: satori does not shape Devanagari (matras can look misplaced); the web
 * report page and the app render Hindi correctly.
 */
export function buildShareElement(report: FactCheckReport, qr: string) {
  const verdict = report.verdict ?? 'unverified';
  const color = VERDICT_COLORS[verdict];
  const claim = report.claims[0]?.claimText ?? report.inputText ?? '';
  const sources = report.claims
    .flatMap((c) => c.sources)
    .filter((s) => s.tier !== 'unknown')
    .slice(0, 2);
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
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>{BRAND_NAME} fact check</div>
      <div style={{ display: 'flex', fontSize: 52, lineHeight: 1.3, marginTop: 64 }}>
        “{clip(claim, 180)}”
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 56,
          alignSelf: 'flex-start',
          backgroundColor: color,
          color: '#fff',
          fontSize: 64,
          fontWeight: 700,
          padding: '16px 36px',
          borderRadius: 16,
        }}
      >
        {FC_VERDICT_LABELS[verdict]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, fontSize: 32 }}>
        {sources.length ? (
          <div style={{ display: 'flex', color: '#555', marginBottom: 12 }}>Sources</div>
        ) : null}
        {sources.map((s) => (
          <div key={s.url} style={{ display: 'flex', marginBottom: 12 }}>
            {s.domain} · {clip(s.title ?? s.publisher ?? '', 60)}
          </div>
        ))}
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
          <div style={{ display: 'flex' }}>{report.reportId}</div>
          <div style={{ display: 'flex' }}>{FOOTER}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori needs <img> */}
        <img src={qr} width={200} height={200} alt="" style={{ flexShrink: 0 }} />
      </div>
    </div>
  );
}
