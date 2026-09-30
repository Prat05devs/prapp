import { NextResponse } from 'next/server';
import { handleApi, readJson } from '@/server/api';
import { getRequestAuth } from '@/server/auth';
import { submitFactCheck } from '@/server/fact-checks';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { createServiceClient } from '@/server/supabase/service';
import { deviceIdSchema } from '@prapp/shared';

export const runtime = 'nodejs';

/** Submit a fact check as a guest (device id) or signed-in user (LLD §11.1). */
export const POST = handleApi(async (req: Request) => {
  const ip = clientIp(req);
  rateLimit(`fc-ip:${ip}`, 20, 60_000); // burst guard; daily limits are enforced in SQL
  const body = (await readJson(req)) as { deviceId?: unknown };
  const auth = await getRequestAuth(req);
  const deviceId = deviceIdSchema.safeParse(body?.deviceId);
  const result = await submitFactCheck(
    createServiceClient(),
    { userId: auth?.user.id ?? null, deviceId: deviceId.success ? deviceId.data : '', ip },
    body,
  );
  return NextResponse.json(result, { status: result.status === 'done' ? 200 : 202 });
});
