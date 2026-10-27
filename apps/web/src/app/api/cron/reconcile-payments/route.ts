import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { deadline, requireCron } from '@/server/cron';
import { razorpayRecoveryGateway } from '@/server/razorpay';
import { reconcilePayments } from '@/server/reconcile';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = handleApi(async (req: Request) => {
  requireCron(req);
  const counts = await reconcilePayments(
    { service: createServiceClient(), gateway: razorpayRecoveryGateway() },
    deadline(50_000),
  );
  return NextResponse.json(counts);
});
