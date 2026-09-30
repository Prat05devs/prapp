import { NextResponse } from 'next/server';
import { handleApi } from '@/server/api';
import { razorpayGateway } from '@/server/razorpay';
import { orderIdParam } from '@/server/route-params';
import { requireStaff } from '@/server/staff';
import { createServiceClient } from '@/server/supabase/service';

export const runtime = 'nodejs';

/** Live Razorpay data next to what the DB has, mismatches flagged (LLD §10.2 payment panel). */
export const GET = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/orders/[id]/payment'>) => {
    const id = orderIdParam((await ctx.params).id);
    await requireStaff(req, 'admin');
    const service = createServiceClient();
    const gw = razorpayGateway();
    const [{ data: intents }, { data: dbPayments }, { data: dbRefunds }] = await Promise.all([
      service
        .from('payment_intents')
        .select('id, razorpay_order_id, amount_minor, currency, status, livemode, created_at')
        .eq('order_id', id)
        .order('created_at'),
      service
        .from('payments')
        .select(
          'id, razorpay_payment_id, status, amount_minor, amount_refunded_minor, is_duplicate',
        )
        .eq('order_id', id),
      service.from('refunds').select('razorpay_refund_id, status, amount_minor').eq('order_id', id),
    ]);

    const byRzpPayment = new Map((dbPayments ?? []).map((p) => [p.razorpay_payment_id, p]));
    const byRzpRefund = new Map((dbRefunds ?? []).map((r) => [r.razorpay_refund_id, r]));
    const out = [];
    for (const intent of intents ?? []) {
      try {
        const [order, payments] = await Promise.all([
          gw.fetchOrder(intent.razorpay_order_id),
          gw.fetchOrderPayments(intent.razorpay_order_id),
        ]);
        const paymentsOut = [];
        for (const p of payments) {
          const db = byRzpPayment.get(p.id);
          const refunds =
            p.status === 'refunded' || p.amount_refunded ? await gw.fetchPaymentRefunds(p.id) : [];
          paymentsOut.push({
            id: p.id,
            method: p.method ?? null,
            status: p.status,
            amount: p.amount,
            createdAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
            dbStatus: db?.status ?? null,
            mismatch:
              !db ||
              (db.status !== p.status &&
                !(db.status === 'partially_refunded' && p.status === 'captured')),
            refunds: refunds.map((r) => ({
              id: r.id,
              status: r.status,
              amount: r.amount,
              dbStatus: byRzpRefund.get(r.id)?.status ?? null,
              mismatch: byRzpRefund.get(r.id)?.status !== r.status,
            })),
          });
        }
        out.push({
          intent,
          razorpayOrder: { id: order.id, status: order.status, amount: order.amount },
          payments: paymentsOut,
        });
      } catch (e) {
        out.push({ intent, error: e instanceof Error ? e.message : 'Razorpay request failed' });
      }
    }
    return NextResponse.json({ intents: out });
  },
);
