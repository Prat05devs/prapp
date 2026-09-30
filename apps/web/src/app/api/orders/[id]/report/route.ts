import { NextResponse } from 'next/server';
import { AppError, handleApi, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { orderIdParam } from '@/server/route-params';

/** 302 to a 5-minute signed URL of the latest report PDF (owner or staff; RLS decides). */
export const GET = handleApi(async (req: Request, ctx: RouteContext<'/api/orders/[id]/report'>) => {
  const id = orderIdParam((await ctx.params).id);
  const { supabase } = await requireRequestAuth(req);
  const { data: order, error } = await supabase
    .from('orders')
    .select('report_status, report_path')
    .eq('id', id)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!order) throw new AppError('order_not_found');
  if (order.report_status !== 'ready' || !order.report_path)
    throw new AppError('order_not_published');
  const signed = await supabase.storage.from('reports').createSignedUrl(order.report_path, 300, {
    download: true,
  });
  if (signed.error || !signed.data) throw new AppError('not_authorized');
  return NextResponse.redirect(signed.data.signedUrl, 302);
});
