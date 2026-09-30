import { publicEnv } from '@/lib/env';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { ShowcaseEditor } from './showcase-editor';

export default async function ShowcasePage() {
  await requireStaffPage('editor');
  const db = await createServerSupabase();
  const { data } = await db
    .from('showcase_stories')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Weekly showcase</h1>
      <p className="text-sm text-slate">
        Stories shown under &quot;Recently published&quot; on the website. Only feature orders whose
        customer agreed to it.
      </p>
      <ShowcaseEditor stories={data ?? []} supabaseUrl={publicEnv().NEXT_PUBLIC_SUPABASE_URL} />
    </main>
  );
}
