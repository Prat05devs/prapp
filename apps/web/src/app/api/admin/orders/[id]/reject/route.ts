import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS } from '@prapp/shared';
import { handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { razorpayGateway } from '@/server/razorpay';
import { refundPayment } from '@/server/refunds';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({ reason: z.string().trim().min(LIMITS.reasonMin) });

/** admin_reject_order as the admin (audited) → full refund via Razorpay (LLD §9.9). */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/reject'>) => {
    const id = orderIdParam((await ctx.params).id);
    const { supabase, user } = await requireStaff(req, 'admin');
    const { reason } = parseBody(bodySchema, await readJson(req));
    const { error } = await supabase.rpc('admin_reject_order', {
      p_order_id: id,
      p_reason: reason,
    });
    if (error) throwDbError(error);

    const service = createServiceClient();
    const { data: order } = await service
      .from('orders')
      .select(
        'paid_payment_id, payments!orders_paid_payment_fk(amount_minor, amount_refunded_minor)',
      )
      .eq('id', id)
      .single();
    if (!order?.paid_payment_id || !order.payments) {
      return NextResponse.json({ rejected: true, refund: null });
    }
    const amount = order.payments.amount_minor - order.payments.amount_refunded_minor;
    const refund =
      amount > 0
        ? await refundPayment(
            { service, gateway: razorpayGateway() },
            {
              orderId: id,
              paymentId: order.paid_payment_id,
              amountMinor: amount,
              reason,
              adminId: user.id,
            },
          )
        : null;
    return NextResponse.json({ rejected: true, refund });
  },
);
