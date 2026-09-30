import { NextResponse } from 'next/server';
import { AppError, handleApi } from '@/server/api';
import { generatePrReport } from '@/server/report';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/regenerate-report'>) => {
    const id = orderIdParam((await ctx.params).id);
    await requireStaff(req, 'admin');
    const report = await generatePrReport(createServiceClient(), id);
    if (!report.ok) {
      if (report.error === 'order_not_published') throw new AppError('order_not_published');
      throw new AppError('internal_error');
    }
    return NextResponse.json({ report: 'ready' });
  },
);
