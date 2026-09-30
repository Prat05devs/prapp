import { describe, expect, it } from 'vitest';
import { formatMoney, majorToMinor, minorToMajor } from './money.ts';

describe('money', () => {
  it('formats paise as rupees', () => {
    expect(formatMoney(49900)).toBe('₹499');
    expect(formatMoney(49950)).toBe('₹499.50');
    expect(formatMoney(1234500)).toBe('₹12,345');
    expect(formatMoney(10000000)).toBe('₹1,00,000');
    expect(formatMoney(500, 'USD')).toBe('$5');
  });
  it('converts major to minor without float drift', () => {
    expect(majorToMinor(499)).toBe(49900);
    expect(majorToMinor('499.5')).toBe(49950);
    expect(majorToMinor(0.29)).toBe(29);
    expect(() => majorToMinor('4.999')).toThrow(RangeError);
    expect(() => majorToMinor(-1)).toThrow(RangeError);
    expect(() => majorToMinor('abc')).toThrow(RangeError);
  });
  it('rejects non-integer minor units', () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError);
    expect(minorToMajor(49900)).toBe(499);
  });
});
