'use client';

import { useState } from 'react';
import { LIMITS, formatIST, formatMoney, majorToMinor, type Currency } from '@prapp/shared';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi, type RazorpayPanel } from '@/lib/admin/api';

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

/** DB summary + live Razorpay view + refunds (admin only, LLD §10.2 / §9.9). */
export function PaymentPanel({
  orderId,
  paidPaymentId,
  currency,
  payments,
  refunds,
}: {
  orderId: string;
  paidPaymentId: string | null;
  amountMinor: number | null;
  currency: Currency;
  payments: Payment[];
  refunds: Refund[];
}) {
  const action = useStaffAction();
  const [live, setLive] = useState<RazorpayPanel | null>(null);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Payment</h2>
        <Button
          variant="outline"
          disabled={action.pending !== null}
          onClick={() =>
            void action.run(
              'rzp',
              () => adminApi.payment(orderId),
              (r) => void setLive(r),
            )
          }
        >
          Refresh from Razorpay
        </Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
          <tr>
            <th>Payment</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Refunded</th>
            <th>Method</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-divider">
              <td className="py-1">
                {formatIST(p.created_at)}
                {p.id === paidPaymentId
                  ? ' (order payment)'
                  : p.status === 'captured'
                    ? ' (extra)'
                    : ''}
              </td>
              <td>{p.status}</td>
              <td>{formatMoney(p.amount_minor, currency)}</td>
              <td>{formatMoney(p.amount_refunded_minor, currency)}</td>
              <td>{p.method ?? '-'}</td>
              <td>
                {['captured', 'partially_refunded'].includes(p.status) ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-strong hover:underline"
                    onClick={() => {
                      setRefundFor(p.id);
                      setAmount(String((p.amount_minor - p.amount_refunded_minor) / 100));
                    }}
                  >
                    Refund…
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {refunds.length ? (
        <div className="text-sm">
          <p className="font-mono text-[11px] tracking-wider text-slate uppercase">Refunds</p>
          {refunds.map((r) => (
            <p key={r.id}>
              {formatIST(r.created_at)} · {formatMoney(r.amount_minor, currency)} · {r.status} ·{' '}
              {r.reason}
            </p>
          ))}
        </div>
      ) : null}

      {refundFor ? (
        <div className="flex flex-col gap-2 rounded-xl border border-hairline p-3">
          <p className="text-sm font-medium">Refund payment (₹)</p>
          <Input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
          <Input
            value={reason}
            placeholder="Reason (at least 10 characters)"
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              disabled={action.pending !== null || reason.trim().length < LIMITS.reasonMin}
              onClick={() => {
                let minor: number;
                try {
                  minor = majorToMinor(amount);
                } catch {
                  action.setError('Enter a valid amount.');
                  return;
                }
                if (!confirm(`Refund ${formatMoney(minor, currency)}?`)) return;
                void action.run(
                  'refund',
                  () =>
                    adminApi.refund(orderId, { paymentId: refundFor, amountMinor: minor, reason }),
                  () => {
                    setRefundFor(null);
                    setReason('');
                    return 'Refund initiated. It completes when Razorpay confirms it.';
                  },
                );
              }}
            >
              Refund
            </Button>
            <Button variant="outline" onClick={() => setRefundFor(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {live ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-mono text-[11px] tracking-wider text-slate uppercase">
            Razorpay (live)
          </p>
          {live.intents.map((i) => (
            <div key={i.intent.id} className="rounded-lg border border-divider p-2">
              <p>
                {i.intent.razorpay_order_id} · intent {i.intent.status} ·{' '}
                {formatMoney(i.intent.amount_minor, currency)}
                {i.intent.livemode ? '' : ' · test mode'}
                {i.razorpayOrder ? ` · Razorpay order ${i.razorpayOrder.status}` : ''}
              </p>
              {i.error ? <p className="text-danger">{i.error}</p> : null}
              {i.payments?.map((p) => (
                <p key={p.id} className={p.mismatch ? 'font-semibold text-danger' : ''}>
                  {p.id} · {p.method ?? '-'} · Razorpay {p.status} / DB {p.dbStatus ?? 'missing'} ·{' '}
                  {formatMoney(p.amount, currency)}
                  {p.refunds.map((r) => (
                    <span key={r.id} className={r.mismatch ? 'text-danger' : ''}>
                      {' '}
                      · refund {r.id} {r.status} / DB {r.dbStatus ?? 'missing'}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <ErrorText>{action.error}</ErrorText>
      {action.notice ? <p className="text-sm text-warn">{action.notice}</p> : null}
    </section>
  );
}
