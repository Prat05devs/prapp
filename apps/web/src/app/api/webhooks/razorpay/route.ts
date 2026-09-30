import { NextResponse } from 'next/server';
import { razorpayGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';
import { handleRazorpayWebhook } from '@/server/webhook';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text(); // raw body, before JSON.parse (signature is over the bytes)
  const out = await handleRazorpayWebhook(
    { service: createServiceClient(), gateway: razorpayGateway() },
    raw,
    req.headers,
  );
  return new NextResponse(out.body, { status: out.status });
}
