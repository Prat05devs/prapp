import 'server-only';
import { notFound } from 'next/navigation';
import { AppError } from '@/server/api';
import { loadReport, publicReport } from '@/server/fact-checks';
import { createServiceClient } from '@/server/supabase/service';

/** Public report by id: 404 if missing, not finished, or made private (LLD §11.4). */
export async function loadPublicReport(reportId: string) {
  if (!/^FC-[0-9A-F]{8}$/.test(reportId)) notFound();
  try {
    const r = await loadReport(createServiceClient(), { reportId });
    if (!r.isPublic || r.status !== 'done') notFound();
    return publicReport(r);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
}
