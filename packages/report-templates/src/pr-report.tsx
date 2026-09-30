import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { BRAND_NAME, formatIST } from '@prapp/shared';

// PR delivery report (LLD §9.11).

export interface PrReportRow {
  platform: string;
  url: string;
  publishedAt: string | null;
}

export interface PrReportData {
  orderNumber: string;
  publishedAt: string;
  customerName: string;
  headline: string;
  packageName: string;
  rows: PrReportRow[];
  support: { phone?: string; email?: string; whatsapp?: string };
  version: number;
  generatedAt: string;
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: '#555' },
  block: { marginBottom: 16 },
  label: { color: '#555', marginBottom: 2 },
  headline: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  table: { borderTopWidth: 1, borderColor: '#ddd', marginTop: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6 },
  th: { fontFamily: 'Helvetica-Bold' },
  cNum: { width: 24 },
  cPlatform: { width: 120 },
  cLink: { flex: 1, paddingRight: 8 },
  cDate: { width: 110 },
  link: { color: '#0b57d0', textDecoration: 'none' },
  note: { marginTop: 16, fontStyle: 'italic', color: '#333' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#555',
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingTop: 6,
  },
});

export function PrReport({ data }: { data: PrReportData }) {
  const contacts = [
    data.support.phone && `Phone ${data.support.phone}`,
    data.support.email && `Email ${data.support.email}`,
    data.support.whatsapp && `WhatsApp ${data.support.whatsapp}`,
  ].filter(Boolean);
  return (
    <Document title={`Publication report ${data.orderNumber}`} author={BRAND_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>{BRAND_NAME}</Text>
          <View>
            <Text style={s.title}>Publication report</Text>
            <Text style={s.muted}>{data.orderNumber}</Text>
            <Text style={s.muted}>Published {formatIST(data.publishedAt)}</Text>
          </View>
        </View>

        <View style={s.block}>
          <Text style={s.label}>Customer</Text>
          <Text>{data.customerName}</Text>
        </View>
        <View style={s.block}>
          <Text style={s.label}>Headline</Text>
          <Text style={s.headline}>{data.headline}</Text>
        </View>
        <View style={s.block}>
          <Text style={s.label}>Package</Text>
          <Text>{data.packageName}</Text>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.th]}>
            <Text style={s.cNum}>#</Text>
            <Text style={s.cPlatform}>Platform</Text>
            <Text style={s.cLink}>Live link</Text>
            <Text style={s.cDate}>Published at</Text>
          </View>
          {data.rows.map((r, i) => (
            <View key={r.url} style={s.row} wrap={false}>
              <Text style={s.cNum}>{i + 1}</Text>
              <Text style={s.cPlatform}>{r.platform}</Text>
              <Link src={r.url} style={[s.cLink, s.link]}>
                {r.url}
              </Link>
              <Text style={s.cDate}>{r.publishedAt ? formatIST(r.publishedAt) : '-'}</Text>
            </View>
          ))}
        </View>

        <Text style={s.note}>
          Sponsored content published by {BRAND_NAME} on its partner network.
        </Text>

        <View style={s.footer} fixed>
          <Text>{contacts.join(' · ')}</Text>
          <Text>
            Report version {data.version} · generated {formatIST(data.generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderPrReport(data: PrReportData): Promise<Buffer> {
  return renderToBuffer(<PrReport data={data} />);
}
