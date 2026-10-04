import { NextResponse } from 'next/server';
import { paymentsMode } from '@/server/env';
import { razorpayGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';
import { handleRazorpayWebhook } from '@/server/webhook';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Only real Razorpay checkout has webhooks; in link/free mode there are no keys to verify with.
  if (paymentsMode() !== 'razorpay') return new NextResponse('not in use', { status: 404 });
  const raw = await req.text(); // raw body, before JSON.parse (signature is over the bytes)
  const out = await handleRazorpayWebhook(
    { service: createServiceClient(), gateway: razorpayGateway() },
    raw,
    req.headers,
  );
  return new NextResponse(out.body, { status: out.status });
}
