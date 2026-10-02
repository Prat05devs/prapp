import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PATTERNS } from '@prapp/shared';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';

const tokenSchema = z.string().regex(PATTERNS.expoPushToken);

/** Registers this device's Expo push token for the signed-in user (LLD §6.3). */
export const POST = handleApi(async (req: Request) => {
  const { supabase } = await requireRequestAuth(req);
  const { token, platform } = parseBody(
    z.object({ token: tokenSchema, platform: z.enum(['ios', 'android']) }),
    await readJson(req),
  );
  const { error } = await supabase.rpc('register_device_token', {
    p_token: token,
    p_platform: platform,
  });
  if (error) throwDbError(error);
  return NextResponse.json({ ok: true });
});

/** On sign-out: stop pushes to this device for the old account. */
export const DELETE = handleApi(async (req: Request) => {
  const { supabase } = await requireRequestAuth(req);
  const { token } = parseBody(z.object({ token: tokenSchema }), await readJson(req));
  const { error } = await supabase.from('device_tokens').delete().eq('expo_push_token', token);
  if (error) throwDbError(error);
  return NextResponse.json({ ok: true });
});
