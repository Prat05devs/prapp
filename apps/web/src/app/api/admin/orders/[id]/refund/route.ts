import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS } from '@prapp/shared';
import { handleApi, parseBody, readJson } from '@/server/api';
import { razorpayGateway } from '@/server/razorpay';
import { refundPayment } from '@/server/refunds';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({
  paymentId: z.uuid(),
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(LIMITS.reasonMin),
});

/** Duplicate-payment or partial-delivery refund (LLD §9.9). */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/refund'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { user } = await requireStaff(req, 'admin');
    const body = parseBody(bodySchema, await readJson(req));
    const refund = await refundPayment(
      { service: createServiceClient(), gateway: razorpayGateway() },
      { orderId: id, ...body, adminId: user.id },
    );
    return NextResponse.json({ refund });
  },
);
