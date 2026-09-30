import Link from 'next/link';
import { Icon } from '@/components/icon';
import { Badge, Eyebrow } from '@/components/ui';
import { adminCounters } from '@/lib/admin/queries';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';

export default async function AdminDashboard() {
  const me = await requireStaffPage();
  const isAdmin = me.role === 'admin';
  const c = await adminCounters(await createServerSupabase(), me.id, isAdmin);
  const tiles = [
    { label: 'Paid (unclaimed)', value: c.paidUnclaimed, href: '/admin/orders?status=paid' },
    { label: 'In progress (mine)', value: c.mine, href: '/admin/orders?status=in_progress&mine=1' },
    { label: 'In progress (all)', value: c.inProgress, href: '/admin/orders?status=in_progress' },
    { label: 'Due in < 6 h', value: c.dueSoon, href: '/admin/orders', warn: c.dueSoon > 0 },
    { label: 'Overdue', value: c.overdue, href: '/admin/orders?overdue=1', alert: c.overdue > 0 },
    {
      label: 'Changes requested',
      value: c.changes,
      href: '/admin/orders?status=changes_requested',
    },
    ...(isAdmin
      ? [
          {
            label: 'Needs attention',
            value: c.attention,
            href: '/admin/attention',
            alert: c.attention > 0,
          },
        ]
      : []),
  ];
  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Eyebrow>Admin desk</Eyebrow>
        <h1 className="font-display text-headline-md text-ink">Dashboard</h1>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const alert = 'alert' in t && t.alert;
          const warn = 'warn' in t && t.warn;
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`group flex flex-col gap-4 rounded-2xl border bg-canvas p-5 transition-colors ${
                alert ? 'border-danger/40 hover:border-danger' : 'border-hairline hover:border-ink'
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <Eyebrow>{t.label}</Eyebrow>
                {alert ? (
                  <Badge variant="danger">Act now</Badge>
                ) : warn ? (
                  <Badge variant="warn">Soon</Badge>
                ) : null}
              </span>
              <span className="flex items-end justify-between gap-2">
                <span
                  className={`font-display text-headline-lg ${alert ? 'text-danger' : 'text-ink'}`}
                >
                  {t.value}
                </span>
                <Icon
                  name="arrow_forward"
                  size={16}
                  className="mb-2 text-faint transition-colors group-hover:text-ink"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
