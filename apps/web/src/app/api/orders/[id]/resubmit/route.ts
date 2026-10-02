import { NextResponse } from 'next/server';
import { resubmitOrder, updateDraft } from '@prapp/api-client';
import { orderContentSchema } from '@prapp/shared';
import { handleApi, parseBody, readJson } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { orderIdParam } from '@/server/route-params';

/** Saves the edited content, then sends a changes-requested order back to the team. */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/orders/[id]/resubmit'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { supabase } = await requireRequestAuth(req);
    const content = parseBody(orderContentSchema, await readJson(req));
    await updateDraft(supabase, id, content);
    await resubmitOrder(supabase, id);
    return NextResponse.json({ ok: true });
  },
);
