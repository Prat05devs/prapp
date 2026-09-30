import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { z } from 'zod';
import { type AppRole, LIMITS, PATTERNS } from '../constants.ts';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'IN';

export interface PhoneCountry {
  code: CountryCode;
  callingCode: string;
}

/** For the country picker: India first, then the rest by calling code. */
export function phoneCountries(): PhoneCountry[] {
  const all = getCountries().map((code) => ({ code, callingCode: getCountryCallingCode(code) }));
  const rest = all
    .filter((c) => c.code !== DEFAULT_PHONE_COUNTRY)
    .sort((a, b) => Number(a.callingCode) - Number(b.callingCode) || a.code.localeCompare(b.code));
  return [{ code: DEFAULT_PHONE_COUNTRY, callingCode: '91' }, ...rest];
}

/**
 * Parses a phone number typed by the user into E.164 (+919876543210), or null
 * if invalid. Phone numbers are not unique and not SMS-verified (LLD §6.2).
 */
export function normalizePhone(
  input: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), country);
  if (!parsed?.isValid()) return null;
  const e164 = parsed.number;
  return PATTERNS.phoneE164.test(e164) ? e164 : null;
}

const countrySchema = z
  .string()
  .refine((c): c is CountryCode => (getCountries() as string[]).includes(c), 'Pick a country');

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(LIMITS.fullNameMax, `Keep it under ${LIMITS.fullNameMax} characters`);

/** Complete-profile form. Output is ready for `profiles` (E.164 phone). */
export const completeProfileSchema = z
  .object({
    fullName: fullNameSchema,
    country: countrySchema.default(DEFAULT_PHONE_COUNTRY),
    phone: z.string().trim().min(1, 'Enter your phone number'),
  })
  .transform((v, ctx) => {
    const phone = normalizePhone(v.phone, v.country as CountryCode);
    if (!phone) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid phone number' });
      return z.NEVER;
    }
    return { fullName: v.fullName, phone };
  });

export type CompleteProfileInput = z.input<typeof completeProfileSchema>;
export type CompleteProfileOutput = z.output<typeof completeProfileSchema>;

/** Mirrors private.profile_complete() in SQL (trimmed name + phone present). */
export function isProfileComplete(
  fullName: string | null | undefined,
  phone: string | null | undefined,
): boolean {
  return (fullName ?? '').trim().length > 0 && phone != null;
}

/** GET /api/me (LLD §6.2). */
export interface MeResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AppRole;
  profileComplete: boolean;
}
