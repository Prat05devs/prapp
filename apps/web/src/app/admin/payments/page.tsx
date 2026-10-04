import Link from 'next/link';
import { formatIST, formatMoney, type Currency } from '@prapp/shared';
import { requireStaffPage } from '@/server/admin-session';
import { createServerSupabase } from '@/server/supabase/server';

/** Recent payments and refunds from the DB; "Check with Razorpay" lives on each order. */
export default async function PaymentsPage() {
  await requireStaffPage('admin');
  const db = await createServerSupabase();
  const [{ data: payments }, { data: refunds }] = await Promise.all([
    db
      .from('payments')
      .select(
        'id, status, amount_minor, amount_refunded_minor, currency, method, created_at, order:orders!payments_order_id_fkey(id, order_number)',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('refunds')
      .select(
        'id, status, amount_minor, reason, created_at, order:orders!refunds_order_id_fkey(id, order_number)',
      )
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-headline-md text-ink">Payments</h1>
      <section className="overflow-x-auto">
        <h2 className="mb-2 font-medium">Recent payments</h2>
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
            <tr>
              <th>When</th>
              <th>Order</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Refunded</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-t border-divider">
                <td className="py-1 whitespace-nowrap">{formatIST(p.created_at)}</td>
                <td>
                  {p.order ? (
                    <Link
                      className="font-medium text-brand hover:underline"
                      href={`/admin/orders/${p.order.id}`}
                    >
                      {p.order.order_number}
                    </Link>
                  ) : null}
                </td>
                <td>{p.status}</td>
                <td>
                  {formatMoney(p.amount_minor, (p.currency.toUpperCase() as Currency) ?? 'INR')}
                </td>
                <td>
                  {formatMoney(
                    p.amount_refunded_minor,
                    (p.currency.toUpperCase() as Currency) ?? 'INR',
                  )}
                </td>
                <td>{p.method ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto">
        <h2 className="mb-2 font-medium">Recent refunds</h2>
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
            <tr>
              <th>When</th>
              <th>Order</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {(refunds ?? []).map((r) => (
              <tr key={r.id} className="border-t border-divider">
                <td className="py-1 whitespace-nowrap">{formatIST(r.created_at)}</td>
                <td>
                  {r.order ? (
                    <Link
                      className="font-medium text-brand hover:underline"
                      href={`/admin/orders/${r.order.id}`}
                    >
                      {r.order.order_number}
                    </Link>
                  ) : null}
                </td>
                <td>{r.status}</td>
                <td>{formatMoney(r.amount_minor)}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
