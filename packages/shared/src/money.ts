import type { Currency } from './constants.ts';

// Money is stored in minor units (paise / cents) as integers. Golden rule 6.

const SYMBOLS: Record<Currency, string> = { INR: '₹', USD: '$' };
const LOCALES: Record<Currency, string> = { INR: 'en-IN', USD: 'en-US' };

/** 49900 INR → "₹499"; 49950 INR → "₹499.50"; 1234500 INR → "₹12,345". */
export function formatMoney(amountMinor: number, currency: Currency = 'INR'): string {
  assertMinor(amountMinor);
  const major = amountMinor / 100;
  const whole = amountMinor % 100 === 0;
  const formatted = major.toLocaleString(LOCALES[currency], {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${SYMBOLS[currency]}${formatted}`;
}

/** Admin forms take rupees; the DB stores paise. 499 → 49900, "499.5" → 49950. */
export function majorToMinor(major: number | string): number {
  const value = typeof major === 'string' ? Number(major.trim()) : major;
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid amount: ${major}`);
  const minor = Math.round(value * 100);
  if (Math.abs(minor - value * 100) > 1e-6) {
    throw new RangeError(`Amount has more than 2 decimals: ${major}`);
  }
  return minor;
}

export function minorToMajor(amountMinor: number): number {
  assertMinor(amountMinor);
  return amountMinor / 100;
}

function assertMinor(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`Minor units must be an integer: ${amountMinor}`);
  }
}
