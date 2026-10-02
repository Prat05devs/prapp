import { describe, expect, it } from 'vitest';
import { POST as action } from '@/app/api/admin/actions/route';
import { POST as records } from '@/app/api/admin/records/[table]/route';
import { createUser, readyDraft, service } from './harness';

const post = (url: string, token: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const table = (name: string) => ({ params: Promise.resolve({ table: name }) }) as never;
const code = async (res: Response) =>
  ((await res.json()) as { error?: { code: string } }).error?.code;

describe('admin actions API (staff_* / admin_* run as the staff member)', () => {
  it('lets editors run editor actions but not admin actions, and validates arguments', async () => {
    const editor = await createUser({ role: 'editor' });
    const customer = await createUser();
    const { orderId } = await readyDraft(customer);

    // staff_add_note on any order is an editor action; the function itself checks the role.
    const ok = await action(
      post('http://x/api/admin/actions', editor.accessToken, {
        action: 'staff_add_note',
        args: { p_order_id: orderId, p_note: 'checked the photos' },
      }),
    );
    expect(ok.status).toBe(200);
    const { data: events } = await service
      .from('order_events')
      .select('event, actor_id')
      .eq('order_id', orderId)
      .eq('event', 'note');
    expect(events?.[0]?.actor_id).toBe(editor.id);

    const denied = await action(
      post('http://x/api/admin/actions', editor.accessToken, {
        action: 'admin_set_role',
        args: { p_user_id: customer.id, p_role: 'admin' },
      }),
    );
    expect(denied.status).toBe(403);

    const invalid = await action(
      post('http://x/api/admin/actions', editor.accessToken, {
        action: 'staff_add_note',
        args: { p_order_id: 'not-a-uuid', p_note: '' },
      }),
    );
    expect(await code(invalid)).toBe('validation_failed');

    const unknown = await action(
      post('http://x/api/admin/actions', editor.accessToken, { action: 'drop_table', args: {} }),
    );
    expect(await code(unknown)).toBe('validation_failed');
  });
});

describe('admin records API (admin-managed tables)', () => {
  it('stamps the admin, refuses editors and unknown tables', async () => {
    const admin = await createUser({ role: 'admin' });
    const editor = await createUser({ role: 'editor' });
    const domain = `t-${Date.now()}.example.test`;

    const res = await records(
      post('http://x/api/admin/records/trusted_sources', admin.accessToken, {
        op: 'upsert',
        // added_by from the browser is ignored: the server stamps the real admin.
        values: { domain, tier: 'tier2', category: 'news', note: null, added_by: editor.id },
      }),
      table('trusted_sources'),
    );
    expect(res.status).toBe(200);
    const { data: row } = await service
      .from('trusted_sources')
      .select('tier, added_by')
      .eq('domain', domain)
      .single();
    expect(row).toEqual({ tier: 'tier2', added_by: admin.id });

    const asEditor = await records(
      post('http://x/api/admin/records/trusted_sources', editor.accessToken, {
        op: 'delete',
        match: { domain },
      }),
      table('trusted_sources'),
    );
    expect(asEditor.status).toBe(403);

    const otherTable = await records(
      post('http://x/api/admin/records/profiles', admin.accessToken, {
        op: 'update',
        match: { id: editor.id },
        values: { role: 'admin' },
      }),
      table('profiles'),
    );
    expect(await code(otherTable)).toBe('validation_failed');

    const removed = await records(
      post('http://x/api/admin/records/trusted_sources', admin.accessToken, {
        op: 'delete',
        match: { domain },
      }),
      table('trusted_sources'),
    );
    expect(removed.status).toBe(200);
  });
});
