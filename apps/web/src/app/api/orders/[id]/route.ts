import { NextResponse } from 'next/server';
import { cancelOrder, deleteDraft, updateDraft } from '@prapp/api-client';
import { orderContentSchema } from '@prapp/shared';
import { AppError, handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { loadOrderDetail } from '@/server/orders';
import { orderIdParam } from '@/server/route-params';

type Ctx = RouteContext<'/api/orders/[id]'>;

export const GET = handleApi(async (req: Request, ctx: Ctx) => {
  const id = orderIdParam((await ctx.params).id);
  const { supabase } = await requireRequestAuth(req);
  return NextResponse.json(await loadOrderDetail(supabase, id));
});

/** Autosave of a draft or of a changes-requested order (content columns only). */
export const PATCH = handleApi(async (req: Request, ctx: Ctx) => {
  const id = orderIdParam((await ctx.params).id);
  const { supabase } = await requireRequestAuth(req);
  const content = parseBody(orderContentSchema, await readJson(req));
  await updateDraft(supabase, id, content);
  return NextResponse.json({ ok: true });
});

/** Discards an order that was never paid: a draft is deleted, a started checkout cancelled. */
export const DELETE = handleApi(async (req: Request, ctx: Ctx) => {
  const id = orderIdParam((await ctx.params).id);
  const { supabase } = await requireRequestAuth(req);
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, current_intent_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!order) throw new AppError('order_not_found');
  if (order.current_intent_id) await cancelOrder(supabase, id);
  else await deleteDraft(supabase, id);
  return NextResponse.json({ ok: true });
});
