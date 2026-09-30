'use client';

import { useState } from 'react';
import type { Json } from '@prapp/db-types';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Setting = { key: string; value: Json; is_public: boolean; updated_at: string };

const LABELS: Record<string, string> = {
  'support.phone': 'Support phone',
  'support.email': 'Support email',
  'support.whatsapp': 'Support WhatsApp',
  'support.hours': 'Support hours',
  'orders.max_images': 'Max images per order',
  'orders.max_new_per_day': 'Max new orders per user per day',
  'orders.pending_expiry_hours': 'Unpaid checkout expires after (hours)',
  'orders.deadline_warning_hours': 'Warn staff before deadline (hours)',
  'factcheck.guest_daily_limit': 'Guest fact checks per day',
  'factcheck.user_daily_limit': 'Signed-in fact checks per day',
};

/** Support contacts and limits (app_settings, admin only under RLS). */
export function SettingsEditor({ settings }: { settings: Setting[] }) {
  const action = useStaffAction();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      settings.map((s) => [s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value)]),
    ),
  );
  const db = createBrowserSupabase();

  function save(s: Setting) {
    const raw = values[s.key] ?? '';
    let value: NonNullable<Json>;
    try {
      value =
        typeof s.value === 'number'
          ? Number(raw)
          : typeof s.value === 'string'
            ? raw
            : (JSON.parse(raw) as NonNullable<Json>);
    } catch {
      action.setError('Invalid value.');
      return;
    }
    if (typeof value === 'number' && (!Number.isInteger(value) || value < 0)) {
      action.setError('Enter a whole number.');
      return;
    }
    void action.run(
      s.key,
      async () => {
        const { data } = await db.auth.getUser();
        return db
          .from('app_settings')
          .update({ value, updated_by: data.user?.id ?? null })
          .eq('key', s.key);
      },
      () => 'Saved.',
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorText>{action.error}</ErrorText>
      {action.notice ? <p className="text-sm text-emerald-strong">{action.notice}</p> : null}
      {settings.map((s) => (
        <div key={s.key} className="flex flex-wrap items-center gap-2">
          <label className="w-72 text-sm">
            {LABELS[s.key] ?? s.key}
            <span className="block text-xs text-faint">
              {s.key}
              {s.is_public ? ' · public' : ''}
            </span>
          </label>
          <div className="min-w-60 flex-1">
            <Input
              value={values[s.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
            />
          </div>
          <Button variant="outline" disabled={action.pending !== null} onClick={() => save(s)}>
            Save
          </Button>
        </div>
      ))}
    </div>
  );
}
