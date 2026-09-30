import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, handleApi } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { reopenOrder } from '@/server/checkout';
import { razorpayGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/orders/[id]/reopen'>) => {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new AppError('order_not_found');
    const { supabase, user } = await requireRequestAuth(req);
    await reopenOrder(
      {
        user: { supabase, userId: user.id },
        service: createServiceClient(),
        gateway: razorpayGateway(),
      },
      id,
    );
    return NextResponse.json({ ok: true });
  },
);
