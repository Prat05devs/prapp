import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS } from '@prapp/shared';
import { AppError, handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { requireStaff, type StaffLevel } from '@/server/staff';

export const runtime = 'nodejs';

const id = z.uuid();
const note = z.string().trim().min(1).max(2000);
const reason = z.string().trim().min(LIMITS.reasonMin).max(2000);

/**
 * Staff/admin actions (golden rule 4: staff writes go through staff_* / admin_* functions).
 * The browser never calls the database: it posts { action, args } here, the server checks the
 * role and the arguments, then runs the function as the signed-in staff member, so the
 * function's own checks (RLS, state machine, audit) still apply.
 */
const ACTIONS = {
  admin_set_role: {
    level: 'admin',
    args: z.object({ p_user_id: id, p_role: z.enum(['user', 'editor', 'admin']) }),
  },
  admin_set_staff_active: {
    level: 'admin',
    args: z.object({ p_user_id: id, p_active: z.boolean() }),
  },
  admin_clear_attention: { level: 'admin', args: z.object({ p_order_id: id, p_note: note }) },
  admin_assign_order: { level: 'admin', args: z.object({ p_order_id: id, p_editor_id: id }) },
  admin_reopen_order: { level: 'admin', args: z.object({ p_order_id: id }) },
  staff_claim_order: { level: 'editor', args: z.object({ p_order_id: id }) },
  staff_release_order: { level: 'editor', args: z.object({ p_order_id: id }) },
  staff_add_note: { level: 'editor', args: z.object({ p_order_id: id, p_note: note }) },
  staff_request_changes: { level: 'editor', args: z.object({ p_order_id: id, p_reason: reason }) },
  staff_set_placement_link: {
    level: 'editor',
    args: z.object({ p_placement_id: id, p_url: z.url().max(2000) }),
  },
  staff_mark_placement_failed: {
    level: 'editor',
    args: z.object({ p_placement_id: id, p_note: note }),
  },
  staff_swap_placement: {
    level: 'editor',
    args: z.object({ p_placement_id: id, p_new_portal_id: id, p_reason: note }),
  },
} as const satisfies Record<string, { level: StaffLevel; args: z.ZodType }>;

export type AdminAction = keyof typeof ACTIONS;

const bodySchema = z.object({
  action: z.enum(Object.keys(ACTIONS) as [AdminAction, ...AdminAction[]]),
  args: z.record(z.string(), z.unknown()),
});

export const POST = handleApi(async (req: Request) => {
  const { action, args } = parseBody(bodySchema, await readJson(req));
  const spec = ACTIONS[action];
  const { supabase, user } = await requireStaff(req, spec.level);
  rateLimit(`admin-action:${user.id}`, 120, 60_000);
  const parsed = spec.args.safeParse(args);
  if (!parsed.success) throw new AppError('validation_failed', parsed.error.issues);
  // Typed per action above; the generated RPC types cannot narrow a union of names.
  const { data, error } = await supabase.rpc(action as never, parsed.data as never);
  if (error) throwDbError(error);
  return NextResponse.json({ ok: true, data: data ?? null });
});
