import { z } from 'zod';
import { parsePaymentsMode } from '@prapp/shared';

// Only EXPO_PUBLIC_* variables exist in the app bundle (golden rule 3).
// Each must be referenced literally so Expo can inline it.
const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.url(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  /** Labels only; the server's PAYMENTS_MODE decides what checkout does. */
  EXPO_PUBLIC_PAYMENTS_MODE: z.enum(['razorpay', 'free']),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | undefined;

export function appEnv(): AppEnv {
  if (cached) return cached;
  const result = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    EXPO_PUBLIC_PAYMENTS_MODE: parsePaymentsMode(process.env.EXPO_PUBLIC_PAYMENTS_MODE),
  });
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${names}. See .env.example.`);
  }
  cached = result.data;
  return cached;
}
