import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { requireCron } from '@/server/cron';
import { publicEnv } from '@/lib/env';
import { supabaseServerEnv } from '@/server/env';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

/** After the Gemini daily reset: re-run reduced checks with the full pipeline (LLD §11.3). */
export const POST = handleApi(async (req: Request) => {
  requireCron(req);
  const service = createServiceClient();
  const { data, error } = await service
    .from('fact_checks')
    .update({ status: 'queued', attempts: 0 })
    .eq('full_check_status', 'queued')
    .eq('status', 'done')
    .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
    .select('id');
  if (error) throw error;
  if (data?.length) {
    // Kick the worker now instead of waiting for the per-minute sweeper.
    await fetch(`${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fact-check-worker`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServerEnv().SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'sweep' }),
    }).catch(() => undefined);
  }
  return NextResponse.json({ requeued: data?.length ?? 0 });
});
