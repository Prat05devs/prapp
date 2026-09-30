import 'server-only';
import { AppError } from '@/server/api';

// Simple in-memory fixed-window limiter for abuse protection on hot routes (LLD §15).
// Per server instance only; the DB limits (orders/day, fact checks/day) are the real guard.

const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): void {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    }
    return;
  }
  w.count += 1;
  if (w.count > max) throw new AppError('rate_limited');
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
