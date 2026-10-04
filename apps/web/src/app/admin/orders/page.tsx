import Link from 'next/link';
import { ORDER_STATUS_LABELS, formatDateIST } from '@prapp/shared';
import { Countdown } from '@/components/orders/countdown';
import { StatusBadge } from '@/components/orders/status-badge';
import { listQueue } from '@/lib/admin/queries';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { AutoRefresh } from '../auto-refresh';

const FILTER_STATUSES = [
  'paid',
  'in_progress',
  'changes_requested',
  'published',
  'rejected',
  'refunded',
] as const;

export default async function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  const me = await requireStaffPage();
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const mine = sp.mine === '1';
  const overdue = sp.overdue === '1';
  const rows = await listQueue(await createServerSupabase(), me.id, { status, mine, overdue });
  // eslint-disable-next-line react-hooks/purity -- server render time for countdowns
  const now = Date.now();

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = {
      status,
      mine: mine ? '1' : undefined,
      overdue: overdue ? '1' : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/orders${qs ? `?${qs}` : ''}`;
  };

  const pill = (on: boolean) =>
    `rounded-full border px-3 py-1 transition-colors ${
      on ? 'border-ink bg-ink text-white' : 'border-hairline text-body hover:border-ink'
    }`;

  return (
    <main className="flex flex-col gap-4">
      <AutoRefresh />
      <h1 className="font-display text-headline-md text-ink">Orders</h1>
      <div className="flex flex-wrap items-center gap-1.5 text-label-sm">
        <Link href={link({ status: undefined })} className={pill(!status)}>
          Queue
        </Link>
        {FILTER_STATUSES.map((s) => (
          <Link key={s} href={link({ status: s })} className={pill(status === s)}>
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-hairline" />
        <Link href={link({ mine: mine ? undefined : '1' })} className={pill(mine)}>
          Mine
        </Link>
        <Link href={link({ overdue: overdue ? undefined : '1' })} className={pill(overdue)}>
          Overdue
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline font-mono text-[11px] tracking-wider text-slate uppercase">
            <tr>
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Headline</th>
              <th className="py-2 pr-4">Package</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Assigned</th>
              <th className="py-2 pr-4">Deadline</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-divider hover:bg-subtle">
                <td className="py-2 pr-4 whitespace-nowrap">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  {o.needs_attention ? <span className="ml-1 text-danger">!</span> : null}
                </td>
                <td className="max-w-xs truncate py-2 pr-4">{o.headline}</td>
                <td className="py-2 pr-4">
                  {((o.package_snapshot ?? {}) as { name?: string }).name ?? '-'}
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={o.status} />
                </td>
                <td className="py-2 pr-4">{o.assignee?.full_name || o.assignee?.email || '-'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {['paid', 'in_progress'].includes(o.status) ? (
                    <Countdown deadline={o.deadline_at} now={now} />
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">{formatDateIST(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="py-6 text-sm text-slate">Nothing here.</p> : null}
      </div>
    </main>
  );
}
