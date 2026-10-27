import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS } from '@prapp/shared';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { razorpayRecoveryGateway } from '@/server/razorpay';
import { executeReservedRefund } from '@/server/refunds';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({ reason: z.string().trim().min(LIMITS.reasonMin) });

/** admin_reject_order as the admin (audited) → full refund via Razorpay (LLD §9.9). */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/reject'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { supabase } = await requireStaff(req, 'admin');
    const { reason } = parseBody(bodySchema, await readJson(req));
    const { data: requestId, error } = await supabase.rpc('admin_reject_and_reserve_refund', {
      p_order_id: id,
      p_reason: reason,
    });
    if (error) throwDbError(error);
    const refund = requestId
      ? await executeReservedRefund(
          { service: createServiceClient(), gateway: razorpayRecoveryGateway() },
          requestId,
        )
      : null;
    return NextResponse.json({ rejected: true, refund });
  },
);
