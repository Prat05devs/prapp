import 'server-only';
import { z } from 'zod';
import { parsePaymentsMode, type PaymentsMode } from '@prapp/shared';
import { parseEnv } from '@/lib/env';

// Server-only secrets (golden rule 3). Importing this from a client component
// fails the build because of 'server-only'.
// Validated lazily per group so a route only needs the secrets it uses.

const supabaseSchema = z.object({ SUPABASE_SECRET_KEY: z.string().min(1) });

const razorpaySchema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RAZORPAY_LIVEMODE: z.enum(['true', 'false']).transform((v) => v === 'true'),
  CHECKOUT_TOKEN_SECRET: z.string().min(32),
});

const cronSchema = z.object({ CRON_SECRET: z.string().min(16) });

function lazy<T extends z.ZodType>(schema: T): () => z.infer<T> {
  let cached: z.infer<T> | undefined;
  return () => (cached ??= parseEnv(schema, process.env));
}

/**
 * DECISION: PAYMENTS_MODE=free (testing phase, owner's request) confirms orders at ₹0 without
 * Razorpay, an explicit exception to golden rule 2. Unset or anything else means Razorpay.
 * NEXT_PUBLIC_PAYMENTS_MODE must match; it only changes labels in the browser.
 */
export function paymentsMode(): PaymentsMode {
  return parsePaymentsMode(process.env.PAYMENTS_MODE);
}

/** PAYMENTS_MODE=link: the razorpay.me page customers are sent to (https only). */
export function paymentLinkUrl(): string | null {
  const raw = process.env.PAYMENT_LINK_URL?.trim();
  return raw && /^https:\/\/razorpay\.me\/@[\w.-]+$/.test(raw) ? raw : null;
}

export function supabaseServerEnv() {
  return parseEnv(supabaseSchema, {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
export const razorpayEnv = lazy(razorpaySchema);
export const cronEnv = lazy(cronSchema);
