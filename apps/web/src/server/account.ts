import 'server-only';
import { AppError, throwDbError } from '@/server/api';
import type { ServiceSupabase } from '@/server/service-types';

/**
 * DELETE /api/me (LLD §6.5): blocked while an order is active; deletes the user's fact-check
 * uploads (order images and reports stay for records), then the auth user. FKs cascade the
 * profile, notifications and device tokens; orders keep their contact snapshot.
 */
export async function deleteAccount(service: ServiceSupabase, userId: string): Promise<void> {
  const { data: allowed, error } = await service.rpc('svc_can_delete_user', { p_user: userId });
  if (error) throwDbError(error);
  if (!allowed) throw new AppError('account_has_active_orders');

  const bucket = service.storage.from('fact-check-uploads');
  for (;;) {
    const { data: files } = await bucket.list(userId, { limit: 100 });
    if (!files?.length) break;
    const { error: rmError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (rmError) throw new AppError('internal_error');
    if (files.length < 100) break;
  }

  const { error: delError } = await service.auth.admin.deleteUser(userId);
  if (delError) throw new AppError('internal_error');
}
