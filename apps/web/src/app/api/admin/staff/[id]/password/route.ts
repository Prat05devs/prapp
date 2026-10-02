import { NextResponse } from 'next/server';
import { z } from 'zod';
import { staffPasswordSchema } from '@prapp/shared';
import { AppError, handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

const bodySchema = z.object({ password: staffPasswordSchema });

/** Admin sets a new password for a team member (editors and admins only, never customers). */
export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/staff/[id]/password'>) => {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new AppError('user_not_found');
    const { user } = await requireStaff(req, 'admin');
    rateLimit(`staff-password:${user.id}`, 20, 60_000);
    const { password } = parseBody(bodySchema, await readJson(req));

    const service = createServiceClient();
    const { data: profile, error } = await service
      .from('profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle();
    if (error) throwDbError(error);
    if (!profile) throw new AppError('user_not_found');
    if (profile.role !== 'editor' && profile.role !== 'admin') throw new AppError('user_not_staff');

    const { error: updateError } = await service.auth.admin.updateUserById(id, { password });
    if (updateError) throw new AppError('internal_error');
    return NextResponse.json({ updated: true });
  },
);
