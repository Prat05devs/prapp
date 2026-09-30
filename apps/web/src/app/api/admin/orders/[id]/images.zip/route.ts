import { zipSync } from 'fflate';
import { AppError, handleApi, throwDbError } from '@/server/api';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';

export const runtime = 'nodejs';

/** All images of an order in one zip, original file names (LLD §10.2, optional convenience). */
export const GET = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/images.zip'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { supabase } = await requireStaff(req, 'editor');
    const [{ data: order }, { data: images, error }] = await Promise.all([
      supabase.from('orders').select('order_number').eq('id', id).maybeSingle(),
      supabase
        .from('order_images')
        .select('storage_path, original_filename, position')
        .eq('order_id', id)
        .order('position'),
    ]);
    if (error) throwDbError(error);
    if (!order || !images?.length) throw new AppError('order_not_found');

    const files: Record<string, Uint8Array> = {};
    for (const img of images) {
      // Staff read access comes from the storage policy (RLS), not the service key.
      const dl = await supabase.storage.from('order-images').download(img.storage_path);
      if (dl.error) throw new AppError('internal_error');
      const ext = img.storage_path.split('.').pop();
      const base = (img.original_filename ?? `image-${img.position}`)
        .replace(/[^\w.\- ]+/g, '_')
        .replace(/\.[^.]+$/, '');
      files[`${img.position}-${base}.${ext}`] = new Uint8Array(await dl.data.arrayBuffer());
    }
    const zip = zipSync(files, { level: 0 });
    return new Response(zip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${order.order_number}-images.zip"`,
      },
    });
  },
);
