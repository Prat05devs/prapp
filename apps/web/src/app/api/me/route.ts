import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { deleteAccount } from '@/server/account';
import { loadMe } from '@/server/profile';
import { createServiceClient } from '@/server/supabase/service';

export const GET = handleApi(async (req: Request) => {
  const { supabase, user } = await requireRequestAuth(req);
  return NextResponse.json(await loadMe(supabase, user.id));
});

export const DELETE = handleApi(async (req: Request) => {
  const { user } = await requireRequestAuth(req);
  await deleteAccount(createServiceClient(), user.id);
  return NextResponse.json({ ok: true });
});
