import 'server-only';
import { AppError, throwDbError } from '@/server/api';
import { requireRequestAuth, type RequestAuth } from '@/server/auth';

export type StaffLevel = 'editor' | 'admin';

/**
 * Admin API guard (LLD §8.3): the server checks the role, and RLS / the staff_* and
 * admin_* functions check it again inside the database.
 */
export async function requireStaff(
  req: Request,
  level: StaffLevel,
): Promise<RequestAuth & { role: 'editor' | 'admin' }> {
  const auth = await requireRequestAuth(req);
  const { data, error } = await auth.supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) throwDbError(error);
  const role = data?.is_active ? data.role : 'user';
  if (role !== 'admin' && !(level === 'editor' && role === 'editor')) {
    throw new AppError('not_authorized');
  }
  return { ...auth, role: role as 'editor' | 'admin' };
}
