import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { deadline, requireCron } from '@/server/cron';
import { paymentsMode } from '@/server/env';
import { razorpayGateway } from '@/server/razorpay';
import { reconcilePayments } from '@/server/reconcile';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = handleApi(async (req: Request) => {
  requireCron(req);
  // Free mode usually runs without Razorpay keys, so there is nothing to reconcile against.
  if (paymentsMode() === 'free' && !process.env.RAZORPAY_KEY_ID) {
    return NextResponse.json({ skipped: 'payments_mode_free' });
  }
  const counts = await reconcilePayments(
    { service: createServiceClient(), gateway: razorpayGateway() },
    deadline(50_000),
  );
  return NextResponse.json(counts);
});
