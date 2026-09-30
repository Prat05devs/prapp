import { notFound } from 'next/navigation';
import { activePortals, activeStaff, getAdminOrder } from '@/lib/admin/queries';
import { requireStaffPage } from '@/server/admin-session';
import { orderIdParam } from '@/server/route-params';
import { createServerSupabase } from '@/server/supabase/server';
import { Workspace } from './workspace';

export default async function AdminOrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  const me = await requireStaffPage();
  let id: string;
  try {
    id = orderIdParam((await params).id);
  } catch {
    notFound();
  }
  const db = await createServerSupabase();
  const data = await getAdminOrder(db, id);
  if (!data) notFound();
  const isAdmin = me.role === 'admin';
  const [portals, staff, payments, refunds] = await Promise.all([
    activePortals(db),
    isAdmin ? activeStaff(db) : Promise.resolve([]),
    isAdmin
      ? db
          .from('payments')
          .select(
            'id, status, amount_minor, amount_refunded_minor, method, captured_at, created_at',
          )
          .eq('order_id', id)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    isAdmin
      ? db
          .from('refunds')
          .select('id, payment_id, amount_minor, status, reason, created_at')
          .eq('order_id', id)
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  // Download links keep the customer's original file name (LLD §10.2).
  const downloads: Record<string, string> = {};
  for (const img of data.images) {
    const s = await db.storage.from('order-images').createSignedUrl(img.storage_path, 3600, {
      download: img.original_filename ?? true,
    });
    if (s.data) downloads[img.id] = s.data.signedUrl;
  }
  const previews: Record<string, string> = {};
  if (data.images.length) {
    const s = await db.storage.from('order-images').createSignedUrls(
      data.images.map((i) => i.storage_path),
      3600,
    );
    for (const r of s.data ?? []) if (r.path && r.signedUrl) previews[r.path] = r.signedUrl;
  }

  return (
    <Workspace
      me={{ id: me.id, role: me.role }}
      data={data}
      portals={portals}
      staff={staff}
      payments={payments.data ?? []}
      refunds={refunds.data ?? []}
      downloads={downloads}
      previews={previews}
      // eslint-disable-next-line react-hooks/purity -- server render time for the countdown
      now={Date.now()}
    />
  );
}
