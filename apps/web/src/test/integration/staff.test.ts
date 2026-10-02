import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { POST as setPassword } from '@/app/api/admin/staff/[id]/password/route';
import { POST as createStaff } from '@/app/api/admin/staff/route';
import { createUser, service } from './harness';

const call = (token: string, body: unknown) =>
  new Request('http://localhost/api/admin/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const passwordCtx = (id: string) => ({ params: Promise.resolve({ id }) });

async function canSignIn(email: string, password: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return !(await db.auth.signInWithPassword({ email, password })).error;
}

describe('team logins (admin creates editor accounts)', () => {
  it('an admin creates an editor login that works with its password', async () => {
    const admin = await createUser({ role: 'admin' });
    const email = `t-staff-${randomUUID().slice(0, 8)}@example.test`;
    const res = await createStaff(
      call(admin.accessToken, {
        fullName: 'Content Writer',
        email,
        password: 'correct-horse-1',
        role: 'editor',
      }),
    );
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    const { data: profile } = await service
      .from('profiles')
      .select('role, full_name')
      .eq('id', id)
      .single();
    expect(profile).toEqual({ role: 'editor', full_name: 'Content Writer' });
    expect(await canSignIn(email, 'correct-horse-1')).toBe(true);

    const again = await createStaff(
      call(admin.accessToken, {
        fullName: 'Dup',
        email,
        password: 'correct-horse-1',
        role: 'editor',
      }),
    );
    expect(((await again.json()) as { error: { code: string } }).error.code).toBe(
      'staff_email_taken',
    );

    const reset = await setPassword(
      new Request(`http://localhost/api/admin/staff/${id}/password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        body: JSON.stringify({ password: 'new-password-22' }),
      }),
      passwordCtx(id) as never,
    );
    expect(reset.status).toBe(200);
    expect(await canSignIn(email, 'new-password-22')).toBe(true);
  });

  it('editors cannot create logins, and customer passwords cannot be set', async () => {
    const editor = await createUser({ role: 'editor' });
    const denied = await createStaff(
      call(editor.accessToken, {
        fullName: 'Nope',
        email: `t-staff-${randomUUID().slice(0, 8)}@example.test`,
        password: 'correct-horse-1',
        role: 'admin',
      }),
    );
    expect(denied.status).toBe(403);

    const admin = await createUser({ role: 'admin' });
    const customer = await createUser();
    const res = await setPassword(
      new Request(`http://localhost/api/admin/staff/${customer.id}/password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        body: JSON.stringify({ password: 'new-password-22' }),
      }),
      passwordCtx(customer.id) as never,
    );
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('user_not_staff');
  });
});
