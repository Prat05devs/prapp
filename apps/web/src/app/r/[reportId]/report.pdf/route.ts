import { buildReportPdf, cachedAsset } from '@/server/fc-assets';
import { createServiceClient } from '@/server/supabase/service';
import { loadPublicReport } from '../load';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: RouteContext<'/r/[reportId]/report.pdf'>) {
  const { reportId } = await ctx.params;
  const report = await loadPublicReport(reportId);
  const bytes = await cachedAsset(createServiceClient(), report, 'pdf', () =>
    buildReportPdf(report),
  );
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${report.reportId}.pdf"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
