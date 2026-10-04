import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

/** Supabase email OTP: 6 digits (config.toml auth.email.otp_length). */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const emailOtpRequestSchema = z.object({ email: emailSchema });
export const emailOtpVerifySchema = z.object({ email: emailSchema, token: otpSchema });

/** Customer password (mobile app): Supabase's minimum is 6; we ask for 8. */
export const customerPasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters');

export const customerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export const customerSignupSchema = z.object({
  email: emailSchema,
  password: customerPasswordSchema,
});

/** Team (editor/admin) passwords, set by an admin: long enough to resist guessing. */
export const staffPasswordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters');

/** POST /api/admin/staff: an admin creates a team login. */
export const staffAccountSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter their name').max(100),
  email: emailSchema,
  password: staffPasswordSchema,
  role: z.enum(['editor', 'admin']),
});
export type StaffAccountInput = z.infer<typeof staffAccountSchema>;

/** Team login form (email + password). */
export const staffLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
