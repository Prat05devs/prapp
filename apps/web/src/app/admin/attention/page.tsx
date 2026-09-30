import Link from 'next/link';
import { formatIST, formatMoney, type Currency } from '@prapp/shared';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';
import { AttentionActions } from './attention-actions';

const REASONS: Record<string, string> = {
  duplicate_payment_refund_due: 'Customer paid twice: refund the extra payment',
  amount_mismatch: 'Captured amount differs from the order price',
  partial_delivery_refund_due: 'Published partially: partial refund due',
  deadline_missed: 'Deadline missed',
  dispute_opened: 'Chargeback / dispute opened',
};

export default async function AttentionPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const { data: orders } = await db
    .from('orders')
    .select(
      'id, order_number, headline, status, attention_reason, paid_payment_id, currency, updated_at',
    )
    .eq('needs_attention', true)
    .order('updated_at', { ascending: false });
  const ids = (orders ?? []).map((o) => o.id);
  const { data: payments } = ids.length
    ? await db
        .from('payments')
        .select('id, order_id, status, amount_minor, amount_refunded_minor, created_at')
        .in('order_id', ids)
    : { data: [] };

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-headline-md text-ink">Needs attention</h1>
      {(orders ?? []).length === 0 ? <p className="text-slate">Nothing needs attention.</p> : null}
      {(orders ?? []).map((o) => {
        const extras = (payments ?? []).filter(
          (p) =>
            p.order_id === o.id &&
            p.id !== o.paid_payment_id &&
            ['captured', 'partially_refunded'].includes(p.status),
        );
        return (
          <section
            key={o.id}
            className="flex flex-col gap-2 rounded-2xl border border-hairline p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/orders/${o.id}`} className="font-medium underline">
                {o.order_number}
              </Link>
              <span className="text-sm text-slate">{o.status}</span>
              <span className="text-sm text-slate">updated {formatIST(o.updated_at)}</span>
            </div>
            <p className="text-sm">{o.headline}</p>
            <p className="text-sm font-medium text-danger">
              {REASONS[o.attention_reason ?? ''] ?? o.attention_reason}
            </p>
            {extras.map((p) => (
              <p key={p.id} className="text-sm">
                Extra payment {formatIST(p.created_at)} ·{' '}
                {formatMoney(
                  p.amount_minor - p.amount_refunded_minor,
                  (o.currency ?? 'INR') as Currency,
                )}{' '}
                refundable
              </p>
            ))}
            <AttentionActions
              orderId={o.id}
              reason={o.attention_reason}
              duplicate={
                extras[0]
                  ? {
                      paymentId: extras[0].id,
                      amountMinor: extras[0].amount_minor - extras[0].amount_refunded_minor,
                    }
                  : null
              }
            />
          </section>
        );
      })}
    </main>
  );
}
