import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { SourcesEditor } from './sources-editor';

export default async function TrustedSourcesPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const { data } = await db.from('trusted_sources').select('*').order('tier').order('domain');
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Trusted sources</h1>
      <p className="text-sm text-slate">
        Tier 1: government and recognised fact-checkers. Tier 2: major news outlets. Everything else
        counts as unknown.
      </p>
      <SourcesEditor sources={data ?? []} />
    </main>
  );
}
