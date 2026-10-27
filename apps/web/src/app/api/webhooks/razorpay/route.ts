import { NextResponse } from 'next/server';
import { razorpayRecoveryGateway } from '@/server/razorpay';
import { createServiceClient } from '@/server/supabase/service';
import { handleRazorpayWebhook } from '@/server/webhook';

import { readLimitedText, RequestBodyTooLarge } from '@/server/request-body';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await readLimitedText(req, 256 * 1024); // Preserve raw text for signature verification.
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return new NextResponse('body too large', { status: 413 });
    return new NextResponse('invalid body', { status: 400 });
  }
  const out = await handleRazorpayWebhook(
    { service: createServiceClient(), gateway: razorpayRecoveryGateway() },
    raw,
    req.headers,
  );
  return new NextResponse(out.body, { status: out.status });
}
