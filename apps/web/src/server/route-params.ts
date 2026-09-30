import 'server-only';
import { z } from 'zod';
import { AppError } from '@/server/api';

export function orderIdParam(id: string): string {
  if (!z.uuid().safeParse(id).success) throw new AppError('order_not_found');
  return id;
}
