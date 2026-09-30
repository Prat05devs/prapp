import Link from 'next/link';
import { listMyOrders } from '@prapp/api-client';
import { formatDateIST, formatMoney, type Currency } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { StatusBadge } from '@/components/orders/status-badge';
import { Page, PageHeader, buttonVariants } from '@/components/ui';
import { requireCompleteUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';

export default async function OrdersPage() {
  const me = await requireCompleteUser('/orders');
  const orders = await listMyOrders(await createServerSupabase(), me.id);

  return (
    <Page width="md">
      <PageHeader
        eyebrow={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        title="Your orders"
        actions={
          <Link href="/publish" className={buttonVariants()}>
            <Icon name="edit" /> New story
          </Link>
        }
      />
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-hairline bg-subtle px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas text-slate">
            <Icon name="inbox" size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-ink">No orders yet</p>
            <p className="text-body-sm text-slate">
              Publish your story on our news portals within 24 hours.
            </p>
          </div>
          <Link href="/publish" className={buttonVariants({ variant: 'accent' })}>
            Publish your story <Icon name="arrow_forward" />
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-hairline bg-canvas p-5 transition-colors hover:border-ink"
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-elevated px-2 py-0.5 font-mono text-code text-ink">
                    {o.orderNumber}
                  </span>
                  <StatusBadge status={o.status} />
                </span>
                <span className="text-label-md text-ink">{o.headline || 'Untitled story'}</span>
                <span className="flex items-center justify-between gap-3 font-mono text-code text-slate">
                  <span>
                    {formatDateIST(o.createdAt)}
                    {o.amountMinor
                      ? ` · ${formatMoney(o.amountMinor, (o.currency ?? 'INR') as Currency)}`
                      : ''}
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={16}
                    className="text-faint transition-colors group-hover:text-ink"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
