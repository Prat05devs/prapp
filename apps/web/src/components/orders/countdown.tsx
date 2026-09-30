import { formatCountdown } from '@prapp/shared';

/** Deadline countdown: red under 6 h, "overdue" when past (LLD §10.1). */
export function Countdown({ deadline, now }: { deadline: string | null; now: number }) {
  if (!deadline) return <span className="text-faint">-</span>;
  const ms = new Date(deadline).getTime() - now;
  const cls = ms < 0 ? 'font-semibold text-danger' : ms < 6 * 3600_000 ? 'text-danger' : '';
  return (
    <span className={cls}>
      {ms < 0
        ? `overdue ${formatCountdown(deadline, now).slice(1)}`
        : formatCountdown(deadline, now)}
    </span>
  );
}
