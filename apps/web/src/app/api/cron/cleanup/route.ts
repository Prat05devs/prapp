import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { runCleanup } from '@/server/cleanup';
import { deadline, requireCron } from '@/server/cron';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = handleApi(async (req: Request) => {
  requireCron(req);
  return NextResponse.json(await runCleanup(createServiceClient(), deadline(50_000)));
});
