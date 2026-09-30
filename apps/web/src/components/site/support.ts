import 'server-only';
import { fetchPublicSettings } from '@prapp/api-client';
import { createServerSupabase } from '@/server/supabase/server';

export interface SupportContacts {
  phone?: string;
  email?: string;
  whatsapp?: string;
  hours?: string;
}

const str = (v: unknown) =>
  typeof v === 'string' && v.trim() && !v.includes('XXXX') ? v : undefined;

/** Support contacts come from app_settings (admin-editable), never hard-coded (LLD §13). */
export async function supportContacts(): Promise<SupportContacts> {
  try {
    const s = await fetchPublicSettings(await createServerSupabase());
    return {
      phone: str(s['support.phone']),
      email: str(s['support.email']),
      whatsapp: str(s['support.whatsapp']),
      hours: str(s['support.hours']),
    };
  } catch {
    return {};
  }
}
