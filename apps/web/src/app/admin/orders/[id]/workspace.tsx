'use client';

import { useState } from 'react';
import { LIMITS, formatIST, formatMoney, type Currency } from '@prapp/shared';
import { Countdown } from '@/components/orders/countdown';
import { StatusBadge } from '@/components/orders/status-badge';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi } from '@/lib/admin/api';
import type { AdminOrder } from '@/lib/admin/queries';
import { PaymentPanel } from './payment-panel';
import { PlacementRow } from './placement-row';

type Portal = { id: string; name: string; domain: string };
type Staff = { id: string; full_name: string; email: string; role: string };
type Payment = {
  id: string;
  status: string;
  amount_minor: number;
  amount_refunded_minor: number;
  method: string | null;
  captured_at: string | null;
  created_at: string;
};
type Refund = {
  id: string;
  payment_id: string;
  amount_minor: number;
  status: string;
  reason: string;
  created_at: string;
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="text-xs font-medium text-emerald-strong hover:underline"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** The data-entry workspace (LLD §10.2). Every action is an RPC or admin API call. */
export function Workspace({
  me,
  data,
  portals,
  staff,
  payments,
  refunds,
  downloads,
  previews,
  now,
}: {
  me: { id: string; role: string };
  data: AdminOrder;
  portals: Portal[];
  staff: Staff[];
  payments: Payment[];
  refunds: Refund[];
  downloads: Record<string, string>;
  previews: Record<string, string>;
  now: number;
}) {
  const { order, images, placements, events } = data;
  const isAdmin = me.role === 'admin';
  const mine = order.assigned_to === me.id;
  const canWork = order.status === 'in_progress' && (mine || isAdmin);
  const action = useStaffAction();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState('');

  const visible = placements.filter((p) => p.status !== 'swapped');
  const pendingCount = visible.filter((p) => p.status === 'pending').length;
  const failedCount = visible.filter((p) => p.status === 'failed').length;
  const liveCount = visible.filter((p) => p.status === 'live').length;
  const currency = (order.currency ?? 'INR') as Currency;
  const snapshot = (order.package_snapshot ?? {}) as { name?: string };
  const handle = order.instagram_handle;
  const phoneDigits = (order.customer_phone ?? '').replace(/\D/g, '');

  return (
    <main className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-headline-md text-ink">{order.order_number}</h1>
        <StatusBadge status={order.status} />
        {['paid', 'in_progress'].includes(order.status) ? (
          <span className="text-sm">
            Deadline <Countdown deadline={order.deadline_at} now={now} />
          </span>
        ) : null}
        <span className="text-sm text-slate">
          Assigned: {order.assignee?.full_name || order.assignee?.email || 'nobody'}
        </span>
        <div className="ml-auto flex gap-2">
          {order.status === 'paid' ? (
            <Button
              disabled={action.pending !== null}
              onClick={() =>
                void action.run('claim', () =>
                  adminApi.action('staff_claim_order', { p_order_id: order.id }),
                )
              }
            >
              Claim
            </Button>
          ) : null}
          {order.status === 'in_progress' && (mine || isAdmin) ? (
            <Button
              variant="outline"
              disabled={action.pending !== null}
              onClick={() =>
                void action.run('release', () =>
                  adminApi.action('staff_release_order', { p_order_id: order.id }),
                )
              }
            >
              Release
            </Button>
          ) : null}
        </div>
      </header>
      {order.needs_attention && isAdmin ? (
        <p className="rounded-xl border border-danger/20 bg-danger-tint/60 p-3 text-sm text-danger-deep">
          Needs attention: {order.attention_reason}
        </p>
      ) : null}
      <ErrorText>{action.error}</ErrorText>
      {action.notice ? <p className="text-sm text-warn">{action.notice}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Content">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate">
              Headline <CopyButton text={order.headline} />
            </div>
            <p className="font-medium">{order.headline}</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate">
              Article ({order.body.trim().length.toLocaleString('en-IN')} chars){' '}
              <CopyButton text={order.body} />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-divider p-2 text-sm whitespace-pre-wrap">
              {order.body}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Instagram:{' '}
            {handle ? (
              <>
                <span className="font-medium">@{handle}</span> <CopyButton text={handle} />
                <a
                  className="text-xs font-medium text-emerald-strong hover:underline"
                  href={`https://instagram.com/${handle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  open profile
                </a>
              </>
            ) : (
              <span className="text-slate">none</span>
            )}
          </div>
          <p className="text-sm">
            Feature on website: <strong>{order.feature_consent ? 'yes' : 'no'}</strong>
          </p>
          <p className="text-sm text-slate">Package: {snapshot.name ?? '-'}</p>
        </Section>

        <div className="flex flex-col gap-4">
          <Section
            title="Images"
            aside={
              images.length ? (
                <a
                  className="text-sm font-medium text-emerald-strong hover:underline"
                  href={`/api/admin/orders/${order.id}/images.zip`}
                >
                  Download all
                </a>
              ) : null
            }
          >
            <div className="grid grid-cols-2 gap-3">
              {images.map((img) => (
                <div key={img.id} className="flex flex-col gap-1 text-xs">
                  {previews[img.storage_path] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={previews[img.storage_path]}
                      alt=""
                      className="aspect-video w-full rounded object-cover"
                    />
                  ) : null}
                  <span>
                    {img.width}×{img.height} · {Math.round(img.size_bytes / 1024)} KB
                  </span>
                  {downloads[img.id] ? (
                    <a
                      className="font-medium text-emerald-strong hover:underline"
                      href={downloads[img.id]}
                    >
                      Download {img.original_filename ?? ''}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Customer">
            <p className="text-sm">{order.customer_name}</p>
            {order.customer_email ? (
              <p className="text-sm">
                <a
                  className="font-medium text-emerald-strong hover:underline"
                  href={`mailto:${order.customer_email}`}
                >
                  {order.customer_email}
                </a>
              </p>
            ) : null}
            {order.customer_phone ? (
              <p className="flex gap-3 text-sm">
                <a
                  className="font-medium text-emerald-strong hover:underline"
                  href={`tel:${order.customer_phone}`}
                >
                  {order.customer_phone}
                </a>
                <a
                  className="font-medium text-emerald-strong hover:underline"
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </p>
            ) : null}
          </Section>

          <Section title="Posting checklist">
            <ul className="list-disc pl-5 text-sm">
              <li>Mark the post as sponsored / partner content.</li>
              <li>
                Use <code>rel=&quot;sponsored&quot;</code> on every outbound link.
              </li>
              <li>
                On Instagram: tag {handle ? `@${handle}` : 'the customer'} and send a collab invite.
              </li>
            </ul>
          </Section>
        </div>
      </div>

      <Section
        title={`Placements (${liveCount} live, ${pendingCount} pending, ${failedCount} failed)`}
      >
        {!canWork && ['paid', 'in_progress'].includes(order.status) ? (
          <p className="text-sm text-slate">Claim the order to add links.</p>
        ) : null}
        <div className="flex flex-col divide-y divide-divider">
          {placements.map((p) => (
            <PlacementRow key={p.id} placement={p} portals={portals} editable={canWork} />
          ))}
        </div>
      </Section>

      <Section title="Actions">
        {['paid', 'in_progress'].includes(order.status) ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink p-2 text-sm"
              placeholder="What should the customer change? (at least 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={action.pending !== null || reason.trim().length < LIMITS.reasonMin}
                onClick={() =>
                  void action.run('changes', () =>
                    adminApi.action('staff_request_changes', {
                      p_order_id: order.id,
                      p_reason: reason,
                    }),
                  )
                }
              >
                Request changes
              </Button>
              {isAdmin ? (
                <Button
                  variant="outline"
                  disabled={action.pending !== null || reason.trim().length < LIMITS.reasonMin}
                  onClick={() => {
                    if (!confirm('Reject this order and refund the full amount?')) return;
                    void action.run(
                      'reject',
                      () => adminApi.reject(order.id, reason),
                      () => 'Rejected. Full refund initiated.',
                    );
                  }}
                >
                  Reject &amp; refund
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {order.status === 'changes_requested' && isAdmin ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink p-2 text-sm"
              placeholder="Reason for rejection (at least 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={action.pending !== null || reason.trim().length < LIMITS.reasonMin}
              onClick={() => {
                if (!confirm('Reject this order and refund the full amount?')) return;
                void action.run(
                  'reject',
                  () => adminApi.reject(order.id, reason),
                  () => 'Rejected. Full refund initiated.',
                );
              }}
            >
              Reject &amp; refund
            </Button>
          </div>
        ) : null}
        {canWork ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                action.pending !== null || pendingCount > 0 || liveCount === 0 || failedCount > 0
              }
              onClick={() =>
                void action.run(
                  'publish',
                  () => adminApi.publish(order.id),
                  (r) =>
                    r.report === 'failed'
                      ? 'Published, but the PDF failed. Use "Regenerate report".'
                      : undefined,
                )
              }
            >
              Publish
            </Button>
            {isAdmin && failedCount > 0 ? (
              <Button
                variant="outline"
                disabled={action.pending !== null || pendingCount > 0 || liveCount === 0}
                onClick={() => {
                  if (
                    !confirm(
                      'Publish with failed portals? The order will be flagged for a partial refund.',
                    )
                  )
                    return;
                  void action.run('publish', () => adminApi.publish(order.id, true));
                }}
              >
                Publish partial
              </Button>
            ) : null}
          </div>
        ) : null}
        {isAdmin && ['paid', 'in_progress'].includes(order.status) ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink px-2 py-2 text-sm"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Reassign to…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email} ({s.role})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!assignee || action.pending !== null}
              onClick={() =>
                void action.run('assign', () =>
                  adminApi.action('admin_assign_order', {
                    p_order_id: order.id,
                    p_editor_id: assignee,
                  }),
                )
              }
            >
              Assign
            </Button>
          </div>
        ) : null}
        {isAdmin && order.status === 'published' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={action.pending !== null}
              onClick={() => {
                if (
                  !confirm(
                    'Reopen this published order to fix a link? A new report version is created on re-publish.',
                  )
                )
                  return;
                void action.run('reopen', () =>
                  adminApi.action('admin_reopen_order', { p_order_id: order.id }),
                );
              }}
            >
              Reopen
            </Button>
            <Button
              variant="outline"
              disabled={action.pending !== null}
              onClick={() =>
                void action.run(
                  'regen',
                  () => adminApi.regenerateReport(order.id),
                  () => 'Report regenerated.',
                )
              }
            >
              Regenerate report
            </Button>
          </div>
        ) : null}
        {order.status === 'published' ? (
          <p className="text-sm">
            Report: {order.report_status}
            {order.report_status === 'ready' ? (
              <>
                {' · '}
                <a
                  className="font-medium text-emerald-strong hover:underline"
                  href={`/api/orders/${order.id}/report`}
                >
                  open PDF (v{order.report_version})
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {order.changes_requested_reason && order.status === 'changes_requested' ? (
          <p className="text-sm text-slate">
            Waiting for the customer: {order.changes_requested_reason}
          </p>
        ) : null}
      </Section>

      {isAdmin ? (
        <PaymentPanel
          orderId={order.id}
          paidPaymentId={order.paid_payment_id}
          amountMinor={order.amount_minor}
          currency={currency}
          payments={payments}
          refunds={refunds}
        />
      ) : null}

      <Section title="Timeline">
        <div className="flex gap-2">
          <Input value={note} placeholder="Add a note" onChange={(e) => setNote(e.target.value)} />
          <Button
            variant="outline"
            disabled={!note.trim() || action.pending !== null}
            onClick={() =>
              void action.run('note', async () => {
                const r = await adminApi.action('staff_add_note', {
                  p_order_id: order.id,
                  p_note: note,
                });
                setNote('');
                return r;
              })
            }
          >
            Add
          </Button>
        </div>
        <ol className="flex flex-col gap-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col border-l-2 border-hairline pl-3">
              <span className="font-mono text-[11px] tracking-wider text-slate uppercase">
                {formatIST(e.created_at)} · {e.actor?.full_name || e.actor?.email || e.actor_type}
              </span>
              <span>
                {e.event.replace(/_/g, ' ')}
                {e.from_status || e.to_status
                  ? ` ${e.from_status ?? ''} → ${e.to_status ?? ''}`
                  : ''}
              </span>
              {e.details && Object.keys(e.details as object).length ? (
                <span className="text-xs break-all text-slate">{JSON.stringify(e.details)}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>
      {order.amount_minor ? (
        <p className="text-xs text-faint">
          Paid amount: {formatMoney(order.amount_minor, currency)}
        </p>
      ) : null}
    </main>
  );
}
