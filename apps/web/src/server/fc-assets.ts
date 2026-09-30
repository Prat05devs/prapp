import 'server-only';
import QRCode from 'qrcode';
import { renderFactCheckReport } from '@prapp/report-templates';
import type { FactCheckReport } from '@prapp/shared';
import { publicEnv } from '@/lib/env';
import type { ServiceSupabase } from '@/server/service-types';

const BUCKET = 'fact-check-share';

export function reportUrl(reportId: string): string {
  return `${publicEnv().NEXT_PUBLIC_SITE_URL}/r/${reportId}`;
}

export function qrDataUrl(reportId: string): Promise<string> {
  return QRCode.toDataURL(reportUrl(reportId), { margin: 1, width: 240 });
}

/**
 * Returns the cached file for a report, or builds and caches it (LLD §11.4).
 * svc_complete_fact_check clears the cached paths whenever the report changes.
 */
export async function cachedAsset(
  service: ServiceSupabase,
  report: FactCheckReport,
  kind: 'image' | 'pdf',
  build: () => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Uint8Array<ArrayBuffer>> {
  const column = kind === 'image' ? 'share_image_path' : 'pdf_path';
  const { data: row } = await service
    .from('fact_checks')
    .select(column)
    .eq('id', report.id)
    .single();
  const existing = (row as Record<string, string | null> | null)?.[column];
  if (existing) {
    const dl = await service.storage.from(BUCKET).download(existing);
    if (dl.data) return new Uint8Array(await dl.data.arrayBuffer());
  }
  const bytes = await build();
  const path = `${report.reportId}/${kind === 'image' ? 'share.png' : 'report.pdf'}`;
  const up = await service.storage.from(BUCKET).upload(path, bytes, {
    contentType: kind === 'image' ? 'image/png' : 'application/pdf',
    upsert: true,
  });
  if (!up.error) {
    await service
      .from('fact_checks')
      .update(kind === 'image' ? { share_image_path: path } : { pdf_path: path })
      .eq('id', report.id);
  }
  return bytes;
}

export async function buildReportPdf(report: FactCheckReport): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(
    await renderFactCheckReport({
      report,
      reportUrl: reportUrl(report.reportId),
      qrDataUrl: await qrDataUrl(report.reportId),
    }),
  );
}

/** TrueType subset from Google Fonts for next/og (only the characters we draw). */
export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text();
    const url = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
