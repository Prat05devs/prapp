import { NextResponse } from 'next/server';
import { handleApi, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';

/** The caller's in-app notifications, newest first (RLS: own rows only). */
export const GET = handleApi(async (req: Request) => {
  const { supabase } = await requireRequestAuth(req);
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throwDbError(error);
  return NextResponse.json(data ?? []);
});
