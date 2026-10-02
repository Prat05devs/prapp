import { NextResponse } from 'next/server';
import { completeProfileSchema } from '@prapp/shared';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
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

/** Completes or edits the profile; column grants allow only name and phone (LLD §6.2). */
export const PATCH = handleApi(async (req: Request) => {
  const { supabase, user } = await requireRequestAuth(req);
  const input = parseBody(completeProfileSchema, await readJson(req));
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: input.fullName, phone: input.phone })
    .eq('id', user.id);
  if (error) throwDbError(error);
  return NextResponse.json(await loadMe(supabase, user.id));
});
