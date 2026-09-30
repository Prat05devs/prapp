import 'server-only';
import { isProfileComplete, type AppRole, type MeResponse } from '@prapp/shared';
import { AppError, throwDbError } from '@/server/api';
import type { UserSupabase } from '@/server/auth';

/** Reads the caller's own profile under RLS and shapes it as GET /api/me. */
export async function loadMe(supabase: UserSupabase, userId: string): Promise<MeResponse> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!data) throw new AppError('user_not_found');
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    role: data.role as AppRole,
    profileComplete: isProfileComplete(data.full_name, data.phone),
  };
}
