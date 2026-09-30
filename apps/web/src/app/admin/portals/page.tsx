import { publicEnv } from '@/lib/env';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { PortalsEditor } from './portals-editor';

export default async function PortalsPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const { data } = await db.from('portals').select('*').order('sort_order').order('name');
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Portals</h1>
      <PortalsEditor portals={data ?? []} supabaseUrl={publicEnv().NEXT_PUBLIC_SUPABASE_URL} />
    </main>
  );
}
