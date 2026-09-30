import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { historyFor } from '@/server/fact-checks';
import { createServiceClient } from '@/server/supabase/service';

export const GET = handleApi(async (req: Request) => {
  const { user } = await requireRequestAuth(req);
  return NextResponse.json(await historyFor(createServiceClient(), user.id));
});
