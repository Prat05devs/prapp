import { NextResponse } from 'next/server';
import { fetchCatalogue, fetchPublicSettings, fetchShowcase } from '@prapp/api-client';
import { handleApi } from '@/server/api';
import { createServerSupabase } from '@/server/supabase/server';

/** Public catalogue: packages, public portals, public settings, showcase stories (anon RLS). */
export const GET = handleApi(async () => {
  const supabase = await createServerSupabase();
  const [catalogue, settings, showcase] = await Promise.all([
    fetchCatalogue(supabase),
    fetchPublicSettings(supabase),
    fetchShowcase(supabase),
  ]);
  return NextResponse.json({ ...catalogue, settings, showcase });
});
