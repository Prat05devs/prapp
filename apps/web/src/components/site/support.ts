import 'server-only';
import { fetchPublicSettings } from '@prapp/api-client';
import { supportContacts as fromSettings, type SupportContacts } from '@prapp/shared';
import { createServerSupabase } from '@/server/supabase/server';

/** Support contacts come from app_settings (admin-editable), never hard-coded (LLD §13). */
export async function supportContacts(): Promise<SupportContacts> {
  try {
    return fromSettings(await fetchPublicSettings(await createServerSupabase()));
  } catch {
    return {};
  }
}
