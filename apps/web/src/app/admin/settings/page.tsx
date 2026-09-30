import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { SettingsEditor } from './settings-editor';

export default async function SettingsPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const { data } = await db
    .from('app_settings')
    .select('key, value, is_public, updated_at')
    .order('key');
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Settings</h1>
      <SettingsEditor settings={data ?? []} />
    </main>
  );
}
