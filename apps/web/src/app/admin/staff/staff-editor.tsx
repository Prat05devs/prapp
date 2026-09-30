'use client';

import { ErrorText } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { createBrowserSupabase } from '@/lib/supabase/browser';

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
  const db = createBrowserSupabase();
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">{title}</h2>
      <ErrorText>{action.error}</ErrorText>
      <table className="w-full text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
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
                      db.rpc('admin_set_role', {
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
                      db.rpc('admin_set_staff_active', {
                        p_user_id: p.id,
                        p_active: e.target.checked,
                      }),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
