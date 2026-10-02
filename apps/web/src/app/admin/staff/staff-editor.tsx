'use client';

import { staffPasswordSchema } from '@prapp/shared';
import { ErrorText, Notice } from '@/components/ui';
import { adminApi } from '@/lib/admin/api';
import { useStaffAction } from '@/hooks/use-staff-action';

type Person = {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'editor' | 'admin';
  is_active: boolean;
};

/** admin_set_role / admin_set_staff_active (last admin and self-deactivation are blocked in SQL). */
export function StaffEditor({
  title,
  people,
  meId,
}: {
  title: string;
  people: Person[];
  meId: string;
}) {
  const action = useStaffAction();
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">{title}</h2>
      <ErrorText>{action.error}</ErrorText>
      {action.notice ? <Notice tone="success">{action.notice}</Notice> : null}
      <table className="w-full text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Login</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="border-t border-divider">
              <td className="py-1">
                {p.full_name || '-'}
                {p.id === meId ? ' (you)' : ''}
              </td>
              <td>{p.email}</td>
              <td>
                <select
                  className="rounded-md border border-hairline bg-canvas outline-none focus:border-ink px-1"
                  value={p.role}
                  disabled={action.pending !== null}
                  onChange={(e) =>
                    void action.run('role', () =>
                      adminApi.action('admin_set_role', {
                        p_user_id: p.id,
                        p_role: e.target.value as Person['role'],
                      }),
                    )
                  }
                >
                  <option value="user">user</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.is_active}
                  disabled={action.pending !== null}
                  onChange={(e) =>
                    void action.run('active', () =>
                      adminApi.action('admin_set_staff_active', {
                        p_user_id: p.id,
                        p_active: e.target.checked,
                      }),
                    )
                  }
                />
              </td>
              <td>
                {p.role === 'editor' || p.role === 'admin' ? (
                  <button
                    type="button"
                    className="text-label-sm text-emerald-strong underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={action.pending !== null}
                    onClick={() => {
                      const password = window.prompt(
                        `New password for ${p.email} (at least 10 characters):`,
                      );
                      if (password === null) return;
                      const parsed = staffPasswordSchema.safeParse(password);
                      if (!parsed.success) {
                        action.setError(parsed.error.issues[0]?.message ?? 'Invalid password');
                        return;
                      }
                      void action.run(
                        'password',
                        () => adminApi.setStaffPassword(p.id, parsed.data),
                        () => `Password updated for ${p.email}.`,
                      );
                    }}
                  >
                    Set password
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
