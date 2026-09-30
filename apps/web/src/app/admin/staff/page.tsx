import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { StaffEditor } from './staff-editor';

export default async function StaffPage({ searchParams }: PageProps<'/admin/staff'>) {
  const me = await requireStaffPage('admin');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const db = await createServerSupabase();
  const [{ data: staff }, { data: found }] = await Promise.all([
    db
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .in('role', ['editor', 'admin'])
      .order('role')
      .order('full_name'),
    q
      ? db
          .from('profiles')
          .select('id, full_name, email, role, is_active')
          .ilike('email', `%${q.replace(/[%_]/g, '')}%`)
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Staff</h1>
      <form className="flex gap-2" action="/admin/staff">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search users by email"
          className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink px-3 py-2"
        />
        <button className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-label-md text-ink transition-colors hover:border-ink">
          Search
        </button>
      </form>
      {q ? <StaffEditor title="Search results" people={found ?? []} meId={me.id} /> : null}
      <StaffEditor title="Current staff" people={staff ?? []} meId={me.id} />
    </main>
  );
}
