import { z } from 'zod';

const label = z.string().trim().min(1).max(80);
const secret = z.string().trim().min(16).max(512);
export const saveIntegrationSchema = z.discriminatedUnion('provider', [
  z
    .object({
      provider: z.literal('razorpay'),
      label,
      environment: z.enum(['test', 'live']),
      keyId: z
        .string()
        .trim()
        .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/),
      keySecret: secret,
      webhookSecret: secret,
    })
    .strict()
    .refine((v) => v.keyId.startsWith(`rzp_${v.environment}_`), {
      message: 'Key ID must match the selected mode.',
      path: ['keyId'],
    }),
  z
    .object({
      provider: z.literal('gemini'),
      label,
      projectId: z
        .string()
        .trim()
        .regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/),
      apiKey: secret,
      model: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9._-]{1,100}$/),
      ocrModel: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9._-]{1,100}$/),
      dailyQuota: z.number().int().min(1).max(1_000_000),
      searchEnabled: z.boolean(),
    })
    .strict(),
]);
export const activateIntegrationSchema = z.object({ id: z.uuid() }).strict();
export type SaveIntegrationInput = z.infer<typeof saveIntegrationSchema>;
export interface IntegrationSummary {
  id: string;
  provider: 'razorpay' | 'gemini';
  label: string;
  environment: 'test' | 'live' | 'production';
  projectId: string | null;
  keyHint: string;
  active: boolean;
  createdAt: string;
}
