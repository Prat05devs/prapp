import type { Db } from '@prapp/api-client';

// Admin/staff reads. They run with the staff member's session: RLS limits editors to the
// work queue (paid and later) and hides admin-only data (LLD §8.3).

const QUEUE_STATUSES = ['paid', 'in_progress', 'changes_requested'] as const;

async function count(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const res = await q;
  return res.count ?? 0;
}

export async function adminCounters(db: Db, userId: string, isAdmin: boolean) {
  const now = new Date();
  const in6h = new Date(now.getTime() + 6 * 3600_000).toISOString();
  const base = () => db.from('orders').select('id', { count: 'exact', head: true });
  const [paidUnclaimed, mine, inProgress, dueSoon, overdue, changes, attention] = await Promise.all(
    [
      count(base().eq('status', 'paid')),
      count(base().eq('status', 'in_progress').eq('assigned_to', userId)),
      count(base().eq('status', 'in_progress')),
      count(
        base()
          .in('status', ['paid', 'in_progress'])
          .gte('deadline_at', now.toISOString())
          .lt('deadline_at', in6h),
      ),
      count(base().in('status', ['paid', 'in_progress']).lt('deadline_at', now.toISOString())),
      count(base().eq('status', 'changes_requested')),
      isAdmin ? count(base().eq('needs_attention', true)) : Promise.resolve(0),
    ],
  );
  return { paidUnclaimed, mine, inProgress, dueSoon, overdue, changes, attention };
}

export interface QueueFilters {
  status?: string;
  mine?: boolean;
  overdue?: boolean;
}

export async function listQueue(db: Db, userId: string, f: QueueFilters) {
  let q = db
    .from('orders')
    .select(
      'id, order_number, headline, status, deadline_at, created_at, needs_attention, package_snapshot, assignee:profiles!orders_assigned_to_fkey(full_name, email)',
    )
    .order('deadline_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(200);
  if (f.status) q = q.eq('status', f.status as (typeof QUEUE_STATUSES)[number]);
  else q = q.in('status', [...QUEUE_STATUSES]);
  if (f.mine) q = q.eq('assigned_to', userId);
  if (f.overdue) q = q.lt('deadline_at', new Date().toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export type QueueRow = Awaited<ReturnType<typeof listQueue>>[number];

export async function getAdminOrder(db: Db, id: string) {
  const [order, images, placements, events] = await Promise.all([
    db
      .from('orders')
      .select('*, assignee:profiles!orders_assigned_to_fkey(id, full_name, email)')
      .eq('id', id)
      .maybeSingle(),
    db.from('order_images').select('*').eq('order_id', id).order('position'),
    db
      .from('order_placements')
      .select('*, portal:portals(id, name, domain, homepage_url)')
      .eq('order_id', id)
      .order('created_at'),
    db
      .from('order_events')
      .select('*, actor:profiles!order_events_actor_id_fkey(full_name, email)')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
  ]);
  if (order.error) throw order.error;
  if (!order.data) return null;
  return {
    order: order.data,
    images: images.data ?? [],
    placements: placements.data ?? [],
    events: events.data ?? [],
  };
}
export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

export async function activePortals(db: Db) {
  const { data } = await db
    .from('portals')
    .select('id, name, domain')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  return data ?? [];
}

export async function activeStaff(db: Db) {
  const { data } = await db
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['editor', 'admin'])
    .eq('is_active', true)
    .order('full_name');
  return data ?? [];
}
