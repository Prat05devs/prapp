import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { deadline, requireCron } from '@/server/cron';
import { razorpayRecoveryGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';
import { processPaymentWebhooks } from '@/server/webhook';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = handleApi(async (req: Request) => {
  requireCron(req);
  return NextResponse.json(
    await processPaymentWebhooks(
      { service: createServiceClient(), gateway: razorpayRecoveryGateway() },
      deadline(45_000),
    ),
  );
});
