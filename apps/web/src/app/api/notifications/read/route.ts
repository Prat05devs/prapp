import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';

const bodySchema = z.object({ ids: z.array(z.uuid()).min(1).max(100) });

/** Marks notifications read; only read_at is writable for customers (column grant). */
export const POST = handleApi(async (req: Request) => {
  const { supabase } = await requireRequestAuth(req);
  const { ids } = parseBody(bodySchema, await readJson(req));
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
  if (error) throwDbError(error);
  return NextResponse.json({ ok: true });
});
