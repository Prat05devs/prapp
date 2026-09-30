import { NextResponse, type NextRequest } from 'next/server';
import { handlePaymentCallback } from '@/server/callback';
import { razorpayGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

/** Razorpay posts the checkout result here (callback_url + redirect: true). */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t') ?? '';
  const form = await req.formData().catch(() => new FormData());
  const target = await handlePaymentCallback(
    { service: createServiceClient(), gateway: razorpayGateway() },
    token,
    form,
  );
  return NextResponse.redirect(target, 303);
}
