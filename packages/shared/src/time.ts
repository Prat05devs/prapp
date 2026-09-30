import { DISPLAY_TIMEZONE } from './constants.ts';

// Times are stored in UTC (timestamptz) and displayed in IST. Golden rule 6.

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(input)}`);
  return d;
}

// Month names are fixed so output is identical on Node, browsers and Hermes
// (ICU versions disagree, e.g. "Sep" vs "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const istParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIMEZONE,
  day: '2-digit',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partsIST(input: DateInput) {
  const parts = istParts.formatToParts(toDate(input));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: get('day'),
    month: MONTHS[Number(get('month')) - 1] ?? '',
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** "27 Sep 2026, 14:05 IST" */
export function formatIST(input: DateInput): string {
  const p = partsIST(input);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} IST`;
}

/** "27 Sep 2026" */
export function formatDateIST(input: DateInput): string {
  const p = partsIST(input);
  return `${p.day} ${p.month} ${p.year}`;
}

/**
 * Deadline countdown for the admin queue. Negative when overdue.
 * "5h 12m", "45m", "-1h 03m"
 */
export function formatCountdown(deadline: DateInput, now: DateInput = Date.now()): string {
  const diffMin = Math.round((toDate(deadline).getTime() - toDate(now).getTime()) / 60_000);
  const sign = diffMin < 0 ? '-' : '';
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h > 0 ? `${sign}${h}h ${String(m).padStart(2, '0')}m` : `${sign}${m}m`;
}
