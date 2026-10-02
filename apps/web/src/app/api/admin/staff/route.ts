import { NextResponse } from 'next/server';
import { staffAccountSchema } from '@prapp/shared';
import { AppError, handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

/**
 * Admin creates a team login (email + password) for the content team.
 * The auth user is created with the service key; the role is then set by admin_set_role
 * called as the admin, so the database checks and audits the role change itself.
 */
export const POST = handleApi(async (req: Request) => {
  const { supabase, user } = await requireStaff(req, 'admin');
  rateLimit(`staff-create:${user.id}`, 20, 60_000);
  const input = parseBody(staffAccountSchema, await readJson(req));

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) {
    if (error && (error.code === 'email_exists' || /already been registered/i.test(error.message)))
      throw new AppError('staff_email_taken');
    throw new AppError('internal_error');
  }

  const { error: roleError } = await supabase.rpc('admin_set_role', {
    p_user_id: data.user.id,
    p_role: input.role,
  });
  if (roleError) {
    // Never leave a half-created login behind.
    await service.auth.admin.deleteUser(data.user.id);
    throwDbError(roleError);
  }
  return NextResponse.json({ id: data.user.id, email: input.email, role: input.role });
});
