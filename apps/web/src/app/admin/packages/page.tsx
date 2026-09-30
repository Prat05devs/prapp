import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { PackagesEditor } from './packages-editor';

export default async function PackagesPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const [{ data: packages }, { data: portals }, { data: links }] = await Promise.all([
    db.from('packages').select('*').order('sort_order').order('price_inr_paise'),
    db.from('portals').select('id, name, is_active').order('sort_order').order('name'),
    db.from('package_portals').select('package_id, portal_id'),
  ]);
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Packages</h1>
      <PackagesEditor packages={packages ?? []} portals={portals ?? []} links={links ?? []} />
    </main>
  );
}
