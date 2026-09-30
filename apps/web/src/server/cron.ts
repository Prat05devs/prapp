import 'server-only';
import { AppError } from '@/server/api';
import { cronEnv } from '@/server/env';
import { safeEqual } from '@/server/razorpay';

/** /api/cron/* require `Authorization: Bearer CRON_SECRET` (LLD §15). */
export function requireCron(req: Request): void {
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronEnv().CRON_SECRET}`;
  if (!safeEqual(header, expected)) throw new AppError('not_authorized');
}

/** Stops long jobs before the platform timeout (LLD §9.8: 50 s). */
export function deadline(ms: number, now = Date.now()) {
  const end = now + ms;
  return () => Date.now() >= end;
}
