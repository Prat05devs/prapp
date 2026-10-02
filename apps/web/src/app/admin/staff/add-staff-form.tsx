'use client';

import { useState } from 'react';
import { staffAccountSchema, type StaffAccountInput } from '@prapp/shared';
import { Button, ErrorText, Field, Input, Notice } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi } from '@/lib/admin/api';

const EMPTY: StaffAccountInput = { fullName: '', email: '', password: '', role: 'editor' };

/** Creates a team login (email + password) through POST /api/admin/staff. */
export function AddStaffForm() {
  const action = useStaffAction();
  const [form, setForm] = useState<StaffAccountInput>(EMPTY);
  const [invalid, setInvalid] = useState<string | null>(null);
  const set = (patch: Partial<StaffAccountInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-subtle p-5">
      <div>
        <h2 className="font-medium text-ink">Add a team member</h2>
        <p className="text-body-sm text-slate">
          Creates a login for the content team. Share the email and password with them; they sign in
          at <span className="font-mono">/team-login</span>. Editors see only the stories to post:
          customer name, headline, text, images and Instagram handle.
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = staffAccountSchema.safeParse(form);
          if (!parsed.success) {
            setInvalid(parsed.error.issues[0]?.message ?? 'Check the fields');
            return;
          }
          setInvalid(null);
          void action.run(
            'create',
            () => adminApi.createStaff(parsed.data),
            (r) => {
              setForm(EMPTY);
              return `Created ${r.email} as ${r.role}. Share the password with them securely.`;
            },
          );
        }}
      >
        <Field label="Full name">
          <Input
            value={form.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            required
          />
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          <Input
            type="text"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set({ password: e.target.value })}
            required
          />
        </Field>
        <Field label="Role">
          <select
            className="h-10 rounded-lg border border-hairline bg-canvas px-3 outline-none focus:border-ink"
            value={form.role}
            onChange={(e) => set({ role: e.target.value as StaffAccountInput['role'] })}
          >
            <option value="editor">Editor (content team)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="accent" disabled={action.pending !== null}>
            Create login
          </Button>
          <ErrorText>{invalid ?? action.error}</ErrorText>
        </div>
      </form>
      {action.notice ? <Notice tone="success">{action.notice}</Notice> : null}
    </section>
  );
}
