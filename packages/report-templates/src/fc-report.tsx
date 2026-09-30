import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import {
  BRAND_NAME,
  FC_DISCLAIMER,
  FC_TOOL_LABELS,
  FC_VERDICT_LABELS,
  PIB_FACT_CHECK_NOTE,
  formatIST,
  type FactCheckReport,
} from '@prapp/shared';

// Fact-check report PDF (LLD §11.4): same content, same order as the web page and share image.
// DECISION: Noto Sans (+ Devanagari for Hindi) is loaded from Google Fonts at render time;
// react-pdf has no full Indic shaping, so some conjuncts may look simplified in the PDF
// (the web page is exact).
let fontsReady: Promise<void> | null = null;

async function ttfUrls(family: string): Promise<{ url: string; weight: number }[]> {
  // Without a browser User-Agent the CSS API serves TrueType, which react-pdf needs.
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${family}`);
  if (!res.ok) throw new Error(`fonts_${res.status}`);
  const css = await res.text();
  const out: { url: string; weight: number }[] = [];
  for (const block of css.split('@font-face').slice(1)) {
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1] ?? 400);
    if (url) out.push({ url, weight });
  }
  return out;
}

function ensureFonts(): Promise<void> {
  fontsReady ??= (async () => {
    const [latin, deva] = await Promise.all([
      ttfUrls('Noto+Sans:wght@400;700'),
      ttfUrls('Noto+Sans+Devanagari:wght@400;700'),
    ]);
    Font.register({
      family: 'NotoSans',
      fonts: latin.map((f) => ({ src: f.url, fontWeight: f.weight })),
    });
    Font.register({
      family: 'NotoSansDevanagari',
      fonts: deva.map((f) => ({ src: f.url, fontWeight: f.weight })),
    });
    Font.registerHyphenationCallback((word) => [word]);
  })().catch((e) => {
    fontsReady = null;
    throw e;
  });
  return fontsReady;
}

const VERDICT_COLOR: Record<string, string> = {
  likely_false: '#b3261e',
  misleading: '#b35c00',
  likely_true: '#1e7b34',
  unverified: '#555555',
};

const hasDevanagari = (s: string | null | undefined) => /[ऀ-ॿ]/.test(s ?? '');

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'NotoSans', color: '#111' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontSize: 16, fontWeight: 700 },
  muted: { color: '#555' },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 4 },
  claim: { fontSize: 12, marginTop: 10 },
  verdict: { fontSize: 18, fontWeight: 700, marginTop: 8 },
  item: { marginBottom: 4 },
  link: { color: '#0b57d0', textDecoration: 'none' },
  badge: { fontSize: 8, color: '#555' },
  disclaimer: { marginTop: 14, fontSize: 8, color: '#555' },
  qr: { width: 72, height: 72 },
});

type Style = Record<string, string | number>;

function T({ children, style }: { children: string; style?: Style }) {
  const deva = hasDevanagari(children) ? { fontFamily: 'NotoSansDevanagari' } : {};
  return <Text style={{ ...style, ...deva }}>{children}</Text>;
}

export function FactCheckPdf({
  report,
  reportUrl,
  qrDataUrl,
}: {
  report: FactCheckReport;
  reportUrl: string;
  qrDataUrl: string;
}) {
  const verdict = report.verdict ?? 'unverified';
  const existing = report.claims.flatMap((c) => c.sources.filter((x) => x.isExistingFactCheck));
  const evidence = report.claims.flatMap((c) => c.sources.filter((x) => !x.isExistingFactCheck));
  const gov = report.claims.some((c) => c.isGovernmentRelated);
  return (
    <Document title={`Fact check ${report.reportId}`} author={BRAND_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.brand}>{BRAND_NAME} fact check</Text>
            <Text style={s.muted}>
              {report.reportId} · checked {report.checkedAt ? formatIST(report.checkedAt) : '-'}
            </Text>
          </View>
          <Image src={qrDataUrl} style={s.qr} />
        </View>

        {report.claims.map((c) => (
          <T key={c.position} style={s.claim}>{`“${c.claimText}”`}</T>
        ))}
        <Text style={[s.verdict, { color: VERDICT_COLOR[verdict] }]}>
          {FC_VERDICT_LABELS[verdict]} · {report.confidence ?? 'low'} confidence
        </Text>
        {report.summary ? <T style={{ marginTop: 6 }}>{report.summary}</T> : null}

        {existing.length ? (
          <View>
            <Text style={s.h2}>Existing fact checks</Text>
            {existing.map((x) => (
              <View key={x.url} style={s.item}>
                <Text>
                  {x.publisher ?? x.domain}: {x.rating ?? ''}
                </Text>
                <Link src={x.url} style={s.link}>
                  {x.url}
                </Link>
              </View>
            ))}
          </View>
        ) : null}

        {evidence.length ? (
          <View>
            <Text style={s.h2}>Evidence</Text>
            {evidence.slice(0, 12).map((x) => (
              <View key={x.url} style={s.item}>
                <T>{`${x.title ?? x.domain}`}</T>
                <Text style={s.badge}>
                  {x.domain} · {x.tier === 'unknown' ? 'unrated source' : x.tier}
                  {x.stance ? ` · ${x.stance}` : ''}
                </Text>
                <Link src={x.url} style={s.link}>
                  {x.url}
                </Link>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={s.h2}>How we checked this</Text>
        {report.toolRuns
          .filter((t) => t.status === 'ok')
          .map((t, i) => (
            <Text key={`${t.tool}-${i}`} style={s.item}>
              • {FC_TOOL_LABELS[t.tool] ?? t.tool}
              {t.model ? ` (${t.model})` : ''}
            </Text>
          ))}
        {report.mode === 'reduced' ? (
          <Text style={{ marginTop: 6 }}>
            Reduced check: our AI tools were at capacity. Full check pending — this report will
            update.
          </Text>
        ) : null}
        {gov ? <Text style={{ marginTop: 8 }}>{PIB_FACT_CHECK_NOTE}</Text> : null}
        <Text style={s.disclaimer}>{FC_DISCLAIMER}</Text>
        <Text style={s.disclaimer}>
          Verify this report: <Link src={reportUrl}>{reportUrl}</Link>
        </Text>
      </Page>
    </Document>
  );
}

export async function renderFactCheckReport(input: {
  report: FactCheckReport;
  reportUrl: string;
  qrDataUrl: string;
}): Promise<Buffer> {
  await ensureFonts();
  return renderToBuffer(<FactCheckPdf {...input} />);
}
