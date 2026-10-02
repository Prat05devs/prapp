import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatIST, formatMoney } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { StatusBadge } from '@/components/orders/status-badge';
import { Badge, buttonVariants, Card, Eyebrow, Notice, Page } from '@/components/ui';
import { AppError } from '@/server/api';
import { paymentLinkUrl, paymentsMode } from '@/server/env';
import { loadOrderDetail } from '@/server/orders';
import { requireCompleteUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { OrderActions } from './order-actions';
import { PaymentBanner } from './payment-banner';

export default async function OrderPage({ params, searchParams }: PageProps<'/orders/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  await requireCompleteUser(`/orders/${id}`);
  const detail = await loadOrderDetail(await createServerSupabase(), id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === 'order_not_found') notFound();
    throw e;
  });
  const { order, placements, refunds } = detail;
  const payment = typeof sp.payment === 'string' ? sp.payment : null;
  // First build (PAYMENTS_MODE=link): payments are made on razorpay.me and checked by an admin.
  const payLink = paymentsMode() === 'link' && order.status === 'paid' ? paymentLinkUrl() : null;
  const reason = typeof sp.reason === 'string' ? sp.reason : null;

  const facts: [string, string][] = [
    ['Created', formatIST(order.createdAt)],
    ...(order.paidAt ? [['Paid', formatIST(order.paidAt)] as [string, string]] : []),
    ...(order.deadlineAt && ['paid', 'in_progress'].includes(order.status)
      ? [['Expected live by', formatIST(order.deadlineAt)] as [string, string]]
      : []),
    ...(order.publishedAt ? [['Published', formatIST(order.publishedAt)] as [string, string]] : []),
  ];

  return (
    <Page width="md">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 self-start text-label-sm text-slate hover:text-ink"
      >
        <Icon name="arrow_back" size={16} /> All orders
      </Link>

      <Card tone="subtle" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-code text-slate uppercase">
              Order <span className="text-ink">{order.orderNumber}</span>
            </span>
            <StatusBadge status={order.status} />
          </div>
          <h1 className="font-display text-headline-md text-ink">{order.headline}</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-canvas p-4">
            <Eyebrow>Package</Eyebrow>
            <span className="text-label-md text-ink">{order.packageName ?? 'Package'}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-canvas p-4">
            <Eyebrow>Amount</Eyebrow>
            <span className="text-label-md text-ink">
              {order.amountMinor != null && order.currency
                ? formatMoney(order.amountMinor, order.currency)
                : '-'}
            </span>
          </div>
        </div>
        <OrderTimeline status={order.status} />
        <dl className="flex flex-col divide-y divide-hairline border-t border-hairline">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 text-body-sm">
              <dt className="text-slate">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {payLink && order.amountMinor ? (
        <Notice
          tone={payment === 'link' ? 'success' : 'info'}
          title={payment === 'link' ? 'Order received: complete your payment' : 'Payment'}
        >
          <span className="flex flex-col gap-3">
            <span>
              Pay <strong>{formatMoney(order.amountMinor, order.currency ?? 'INR')}</strong> on our
              Razorpay page and write your order number{' '}
              <strong className="font-mono">{order.orderNumber}</strong> in the note. We check every
              payment and then publish your story. Already paid? Nothing more to do.
            </span>
            <a
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'accent', className: 'self-start' })}
            >
              Pay {formatMoney(order.amountMinor, order.currency ?? 'INR')} on Razorpay{' '}
              <Icon name="link" />
            </a>
          </span>
        </Notice>
      ) : null}
      {payment && !payLink ? (
        <PaymentBanner
          orderId={order.id}
          status={order.status}
          payment={payment}
          reason={reason}
          free={order.amountMinor === 0}
        />
      ) : null}

      {order.status === 'changes_requested' ? (
        <Notice tone="warn" title="Our team asked for changes">
          <p>{order.changesRequestedReason}</p>
        </Notice>
      ) : null}
      {order.status === 'rejected' ? (
        <Notice tone="danger" title="We could not publish your story">
          <p>{order.rejectionReason}</p>
          <p className="mt-2">
            A full refund has been initiated. Banks can take 5–7 working days to show it.
          </p>
        </Notice>
      ) : null}

      {placements.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="public" className="text-emerald-strong" />
            <h2 className="font-display text-headline-sm text-ink">Your story is live</h2>
          </div>
          <ul className="flex flex-col gap-3">
            {placements.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-hairline p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label-md text-ink">{p.platform}</span>
                  <Badge variant="emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Live
                  </Badge>
                </div>
                <a
                  className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-subtle px-3 py-2 font-mono text-code text-body transition-colors hover:border-ink"
                  href={p.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="truncate">{p.liveUrl}</span>
                  <Icon name="north_east" size={16} className="text-slate" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {refunds.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-headline-sm text-ink">Refunds</h2>
          <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
            {refunds.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-body-sm"
              >
                <span className="text-label-md text-ink">
                  {formatMoney(r.amountMinor, order.currency ?? 'INR')}
                </span>
                <Badge>{r.status}</Badge>
                <span className="font-mono text-code text-slate">{formatIST(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OrderActions
        orderId={order.id}
        status={order.status}
        reportStatus={order.reportStatus}
        hasReport={Boolean(detail.reportUrl)}
      />
    </Page>
  );
}
