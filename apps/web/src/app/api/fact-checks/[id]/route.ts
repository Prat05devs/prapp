import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, handleApi, parseBody, readJson } from '@/server/api';
import { getRequestAuth } from '@/server/auth';
import { isOwner, loadReport, publicReport } from '@/server/fact-checks';
import { createServiceClient } from '@/server/supabase/service';

function idParam(id: string) {
  if (!z.uuid().safeParse(id).success) throw new AppError('not_authorized');
  return id;
}

/** Poll a result: the signed-in owner, or the same device for guest checks (LLD §8.4). */
export const GET = handleApi(
  async (req: NextRequest, ctx: RouteContext<'/api/fact-checks/[id]'>) => {
    const id = idParam((await ctx.params).id);
    const auth = await getRequestAuth(req);
    const deviceId = req.nextUrl.searchParams.get('deviceId') ?? req.headers.get('x-device-id');
    const report = await loadReport(createServiceClient(), { id });
    if (!isOwner(report, auth?.user.id ?? null, deviceId)) throw new AppError('not_authorized');
    return NextResponse.json(publicReport(report), { headers: { 'Cache-Control': 'no-store' } });
  },
);

const patchSchema = z.object({ isPublic: z.boolean(), deviceId: z.string().optional() });

export const PATCH = handleApi(
  async (req: NextRequest, ctx: RouteContext<'/api/fact-checks/[id]'>) => {
    const id = idParam((await ctx.params).id);
    const { isPublic, deviceId } = parseBody(patchSchema, await readJson(req));
    const auth = await getRequestAuth(req);
    const service = createServiceClient();
    const report = await loadReport(service, { id });
    if (!isOwner(report, auth?.user.id ?? null, deviceId ?? null))
      throw new AppError('not_authorized');
    const { error } = await service
      .from('fact_checks')
      .update({ is_public: isPublic })
      .eq('id', id);
    if (error) throw new AppError('internal_error');
    return NextResponse.json({ ok: true });
  },
);
