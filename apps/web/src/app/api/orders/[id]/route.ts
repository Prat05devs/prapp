import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, handleApi } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { loadOrderDetail } from '@/server/orders';

export const GET = handleApi(async (req: Request, ctx: RouteContext<'/api/orders/[id]'>) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new AppError('order_not_found');
  const { supabase } = await requireRequestAuth(req);
  return NextResponse.json(await loadOrderDetail(supabase, id));
});
