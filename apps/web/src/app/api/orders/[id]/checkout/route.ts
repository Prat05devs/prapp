import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, handleApi, parseBody, readJson } from '@/server/api';
import { requireRequestAuth } from '@/server/auth';
import { startCheckout } from '@/server/checkout';
import { rateLimit } from '@/server/rate-limit';
import { paymentLinkUrl, paymentsMode } from '@/server/env';
import { razorpayGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({ returnTo: z.enum(['web', 'app']).default('web') });

export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/orders/[id]/checkout'>) => {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new AppError('order_not_found');
    const { supabase, user } = await requireRequestAuth(req);
    rateLimit(`checkout:${user.id}`, 10, 60_000);
    const { returnTo } = parseBody(bodySchema, await readJson(req));
    const mode = paymentsMode();
    const result = await startCheckout(
      {
        user: { supabase, userId: user.id },
        service: createServiceClient(),
        mode,
        paymentUrl: paymentLinkUrl(),
        gateway: mode === 'razorpay' ? razorpayGateway() : undefined,
      },
      id,
      returnTo,
    );
    return NextResponse.json(result);
  },
);
