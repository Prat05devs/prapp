import { ImageResponse } from 'next/og';
import { buildShareElement, shareImageText } from '@/components/fact-check/share-image';
import { cachedAsset, loadGoogleFont, qrDataUrl } from '@/server/fc-assets';
import { createServiceClient } from '@/server/supabase/service';
import { loadPublicReport } from '../load';

export const runtime = 'nodejs';

/** 1080×1350 share card: claim, verdict, top 2 sources, QR, brand (LLD §11.4). */
export async function GET(_req: Request, ctx: RouteContext<'/r/[reportId]/image.png'>) {
  const { reportId } = await ctx.params;
  const report = await loadPublicReport(reportId);
  const bytes = await cachedAsset(createServiceClient(), report, 'image', async () => {
    const element = buildShareElement(report, await qrDataUrl(report.reportId));
    const text = shareImageText(report);
    const fonts = (
      await Promise.all([
        loadGoogleFont('Noto+Sans', 400, text).then(
          (d) => d && { name: 'Noto', data: d, weight: 400 as const, style: 'normal' as const },
        ),
        loadGoogleFont('Noto+Sans', 700, text).then(
          (d) => d && { name: 'Noto', data: d, weight: 700 as const, style: 'normal' as const },
        ),
        loadGoogleFont('Noto+Sans+Devanagari', 400, text).then(
          (d) => d && { name: 'NotoDeva', data: d, weight: 400 as const, style: 'normal' as const },
        ),
        loadGoogleFont('Noto+Sans+Devanagari', 700, text).then(
          (d) => d && { name: 'NotoDeva', data: d, weight: 700 as const, style: 'normal' as const },
        ),
      ])
    ).filter((f) => f !== null);
    const img = new ImageResponse(element, { width: 1080, height: 1350, fonts });
    return new Uint8Array(await img.arrayBuffer());
  });
  return new Response(bytes, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
  });
}
