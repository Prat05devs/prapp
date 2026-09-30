import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { generatePrReport } from '@/server/report';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({ allowPartial: z.boolean().default(false) });

/** staff_mark_published (as the editor) → PDF → svc_set_report (LLD §8.3, §9.11). */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/publish'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { supabase } = await requireStaff(req, 'editor');
    const { allowPartial } = parseBody(bodySchema, await readJson(req).catch(() => ({})));
    const { error } = await supabase.rpc('staff_mark_published', {
      p_order_id: id,
      p_allow_partial: allowPartial,
    });
    if (error) throwDbError(error);
    const report = await generatePrReport(createServiceClient(), id);
    return NextResponse.json({ published: true, report: report.ok ? 'ready' : 'failed' });
  },
);
