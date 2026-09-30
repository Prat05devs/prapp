import { describe, expect, it } from 'vitest';
import { formatCountdown, formatDateIST, formatIST } from './time.ts';

describe('IST formatting', () => {
  it('converts UTC to IST (+05:30)', () => {
    expect(formatIST('2026-09-27T08:35:00Z')).toBe('27 Sep 2026, 14:05 IST');
    expect(formatIST('2026-09-27T20:00:00Z')).toBe('28 Sep 2026, 01:30 IST');
    expect(formatDateIST('2026-09-27T20:00:00Z')).toBe('28 Sep 2026');
  });
  it('formats countdowns', () => {
    const now = '2026-09-27T00:00:00Z';
    expect(formatCountdown('2026-09-27T05:12:00Z', now)).toBe('5h 12m');
    expect(formatCountdown('2026-09-27T00:45:00Z', now)).toBe('45m');
    expect(formatCountdown('2026-09-26T22:57:00Z', now)).toBe('-1h 03m');
  });
  it('rejects invalid dates', () => {
    expect(() => formatIST('nope')).toThrow(RangeError);
  });
});
