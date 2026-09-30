import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

/** Supabase email OTP: 6 digits (config.toml auth.email.otp_length). */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const emailOtpRequestSchema = z.object({ email: emailSchema });
export const emailOtpVerifySchema = z.object({ email: emailSchema, token: otpSchema });
