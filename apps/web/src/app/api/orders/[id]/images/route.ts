import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOrderImage, signedImageUrls, uploadOrderImage } from '@prapp/api-client';
import { LIMITS, orderImageMetaSchema } from '@prapp/shared';
import { AppError, handleApi, parseBody, throwDbError } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { rateLimit } from '@/server/rate-limit';
import { orderIdParam } from '@/server/route-params';

export const runtime = 'nodejs';

/**
 * Uploads one image (multipart: `file`, `meta` JSON, optional `replaceImageId`), LLD §9.3
 * step 2. The device has already compressed it; Storage and order_images RLS still apply.
 */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/orders/[id]/images'>) => {
    const orderId = orderIdParam((await ctx.params).id);
    const { supabase, user } = await requireRequestAuth(req);
    rateLimit(`image-upload:${user.id}`, 20, 60_000);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError('validation_failed');
    }
    const file = form.get('file');
    if (!(file instanceof Blob) || file.size === 0) throw new AppError('validation_failed');
    if (file.size > LIMITS.imageMaxBytes) throw new AppError('validation_failed');
    let rawMeta: unknown;
    try {
      rawMeta = JSON.parse(String(form.get('meta') ?? '{}'));
    } catch {
      throw new AppError('validation_failed');
    }
    // The size is measured here, not taken from the client.
    const meta = parseBody(orderImageMetaSchema, {
      ...(typeof rawMeta === 'object' && rawMeta ? rawMeta : {}),
      sizeBytes: file.size,
    });
    const replace = form.get('replaceImageId');

    if (typeof replace === 'string' && replace) {
      const replaceId = parseBody(z.uuid(), replace);
      const { data: existing, error } = await supabase
        .from('order_images')
        .select('id, storage_path')
        .eq('id', replaceId)
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throwDbError(error);
      if (existing)
        await removeOrderImage(supabase, { id: existing.id, storagePath: existing.storage_path });
    }

    const image = await uploadOrderImage(supabase, {
      userId: user.id,
      orderId,
      fileId: crypto.randomUUID(),
      data: await file.arrayBuffer(),
      meta,
    });
    const urls = await signedImageUrls(supabase, [image.storagePath]);
    return NextResponse.json({ image, url: urls[image.storagePath] ?? null }, { status: 201 });
  },
);
