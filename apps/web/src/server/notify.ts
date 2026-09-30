import 'server-only';
import type { Json } from '@prapp/db-types';
import type { ServiceSupabase } from '@/server/service-types';

/**
 * Alerts every active admin (in-app + email) for things a human must handle:
 * duplicate payment, amount mismatch, dispute (LLD §9.7, §9.10 rows 8, 9, 21).
 */
export async function notifyAdmins(
  service: ServiceSupabase,
  alert: { type: string; title: string; body: string; orderId?: string },
): Promise<void> {
  const { data: admins, error } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);
  if (error || !admins?.length) {
    console.error('notifyAdmins: no admin to notify', error?.message);
    return;
  }
  const data: Json = alert.orderId
    ? { order_id: alert.orderId, deep_link: `/admin/orders/${alert.orderId}` }
    : {};
  const { error: insertError } = await service.from('notifications').insert(
    admins.map((a) => ({
      user_id: a.id,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      data,
      channels: ['in_app', 'email'],
    })),
  );
  if (insertError) console.error('notifyAdmins insert failed', insertError.message);
}
