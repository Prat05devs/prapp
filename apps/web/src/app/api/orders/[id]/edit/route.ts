import { NextResponse } from 'next/server';
import { getOrder, signedImageUrls } from '@prapp/api-client';
import { handleApi } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { orderIdParam } from '@/server/route-params';

/** Everything the order editor needs: content, images and 1-hour thumbnail URLs. */
export const GET = handleApi(async (req: Request, ctx: RouteContext<'/api/orders/[id]/edit'>) => {
  const id = orderIdParam((await ctx.params).id);
  const { supabase } = await requireRequestAuth(req);
  const order = await getOrder(supabase, id);
  const imageUrls = await signedImageUrls(
    supabase,
    order.images.map((i) => i.storagePath),
  );
  return NextResponse.json({ order, imageUrls });
});
