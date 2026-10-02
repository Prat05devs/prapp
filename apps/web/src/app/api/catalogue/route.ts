import { NextResponse } from 'next/server';
import { fetchCatalogue, fetchPublicSettings } from '@prapp/api-client';
import { handleApi } from '@/server/api';
import { createServerSupabase } from '@/server/supabase/server';

/** Public catalogue: active packages, public portals, public settings (anon RLS). */
export const GET = handleApi(async () => {
  const supabase = await createServerSupabase();
  const [catalogue, settings] = await Promise.all([
    fetchCatalogue(supabase),
    fetchPublicSettings(supabase),
  ]);
  return NextResponse.json({ ...catalogue, settings });
});
