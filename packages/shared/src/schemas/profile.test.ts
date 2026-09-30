import { describe, expect, it } from 'vitest';
import {
  completeProfileSchema,
  isProfileComplete,
  normalizePhone,
  phoneCountries,
} from './profile.ts';
import { emailOtpVerifySchema } from './auth.ts';

describe('normalizePhone', () => {
  it('defaults to India and returns E.164', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
  });
  it('supports other countries', () => {
    expect(normalizePhone('(201) 555-0123', 'US')).toBe('+12015550123');
  });
  it('rejects invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('not a phone')).toBeNull();
  });
});

describe('completeProfileSchema', () => {
  it('trims the name and normalises the phone', () => {
    expect(completeProfileSchema.parse({ fullName: '  Asha Rawat ', phone: '9876543210' })).toEqual(
      { fullName: 'Asha Rawat', phone: '+919876543210' },
    );
  });
  it('reports field errors', () => {
    const r = completeProfileSchema.safeParse({ fullName: '  ', phone: '123' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join('.'))).toContain('fullName');
  });
  it('flags an invalid phone on the phone field', () => {
    const r = completeProfileSchema.safeParse({ fullName: 'Asha', phone: '123' });
    expect(r.error?.issues[0]?.path).toEqual(['phone']);
  });
  it('rejects unknown countries', () => {
    expect(
      completeProfileSchema.safeParse({ fullName: 'Asha', phone: '9876543210', country: 'XX' })
        .success,
    ).toBe(false);
  });
  it('rejects names over 100 chars (DB CHECK)', () => {
    expect(
      completeProfileSchema.safeParse({ fullName: 'a'.repeat(101), phone: '9876543210' }).success,
    ).toBe(false);
  });
});

describe('isProfileComplete', () => {
  it('mirrors private.profile_complete', () => {
    expect(isProfileComplete('Asha', '+919876543210')).toBe(true);
    expect(isProfileComplete('  ', '+919876543210')).toBe(false);
    expect(isProfileComplete('Asha', null)).toBe(false);
  });
});

describe('phoneCountries', () => {
  it('lists India first', () => {
    expect(phoneCountries()[0]).toEqual({ code: 'IN', callingCode: '91' });
    expect(phoneCountries().length).toBeGreaterThan(200);
  });
});

describe('email OTP', () => {
  it('normalises email and requires 6 digits', () => {
    expect(emailOtpVerifySchema.parse({ email: ' A@X.in ', token: '123456' })).toEqual({
      email: 'a@x.in',
      token: '123456',
    });
    expect(emailOtpVerifySchema.safeParse({ email: 'a@x.in', token: '12345' }).success).toBe(false);
  });
});
