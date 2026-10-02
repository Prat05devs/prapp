import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOrderImage } from '@prapp/api-client';
import { AppError, handleApi, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { orderIdParam } from '@/server/route-params';

/** Removes one image (row, then Storage object), LLD §9.3 step 3. */
export const DELETE = handleApi(
  async (req: Request, ctx: RouteContext<'/api/orders/[id]/images/[imageId]'>) => {
    const { id, imageId } = await ctx.params;
    const orderId = orderIdParam(id);
    if (!z.uuid().safeParse(imageId).success) throw new AppError('order_not_found');
    const { supabase } = await requireRequestAuth(req);
    const { data: image, error } = await supabase
      .from('order_images')
      .select('id, storage_path')
      .eq('id', imageId)
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throwDbError(error);
    if (!image) throw new AppError('order_not_found');
    await removeOrderImage(supabase, { id: image.id, storagePath: image.storage_path });
    return NextResponse.json({ ok: true });
  },
);
