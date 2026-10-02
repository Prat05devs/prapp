import { NextResponse } from 'next/server';
import { createDraft, listMyOrders } from '@prapp/api-client';
import { orderContentSchema } from '@prapp/shared';
import { handleApi, parseBody, readJson } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { rateLimit } from '@/server/rate-limit';

/** The caller's orders, newest first. */
export const GET = handleApi(async (req: Request) => {
  const { supabase, user } = await requireRequestAuth(req);
  return NextResponse.json(await listMyOrders(supabase, user.id));
});

/** Creates a draft (LLD §9.3 step 1); RLS and triggers check profile, limits and package. */
export const POST = handleApi(async (req: Request) => {
  const { supabase, user } = await requireRequestAuth(req);
  rateLimit(`create-draft:${user.id}`, 10, 60_000);
  const content = parseBody(orderContentSchema, await readJson(req));
  return NextResponse.json(await createDraft(supabase, content), { status: 201 });
});
