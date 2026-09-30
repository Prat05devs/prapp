import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BRAND_NAME, formatMoney, type Currency } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { Eyebrow } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { verifyCheckoutToken } from '@/server/checkout-token';
import { razorpayEnv } from '@/server/env';
import { RAZORPAY_APP_TAG } from '@/server/razorpay';
import { paymentResultUrl } from '@/server/payment-redirect';
import { createServiceClient } from '@/server/supabase/service';
import { PayButton } from './pay-button';
import { RetryCheckout } from './retry-checkout';

export const metadata: Metadata = { title: `Pay · ${BRAND_NAME}`, robots: { index: false } };

const PAID_OR_LATER = [
  'paid',
  'in_progress',
  'changes_requested',
  'published',
  'rejected',
  'refunded',
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
          <Icon name="lock" />
        </span>
        <div className="flex flex-col">
          <span className="font-display text-headline-sm leading-tight text-ink">
            Secure checkout
          </span>
          <span className="font-mono text-code text-slate uppercase">Payments by Razorpay</span>
        </div>
      </div>
      {children}
    </main>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-subtle p-6">
      <h1 className="font-display text-headline-sm text-ink">{title}</h1>
      {children ? (
        <div className="flex flex-col gap-3 text-body-md text-body">{children}</div>
      ) : null}
    </div>
  );
}

/** Hosted Razorpay checkout for web and app (LLD §9.5). */
export default async function PayPage({ params }: PageProps<'/pay/[token]'>) {
  const { token } = await params;
  const env = razorpayEnv();
  const check = verifyCheckoutToken(token, env.CHECKOUT_TOKEN_SECRET);

  if (!check.ok && check.reason === 'invalid') {
    return (
      <Shell>
        <Message title="This payment link isn't valid">
          <p>Open your order and tap Pay again.</p>
        </Message>
      </Shell>
    );
  }

  const payload = check.payload!;
  const service = createServiceClient();
  const [{ data: order }, { data: intent }] = await Promise.all([
    service
      .from('orders')
      .select(
        'id, order_number, status, headline, customer_name, customer_email, customer_phone, package_snapshot, current_intent_id',
      )
      .eq('id', payload.orderId)
      .maybeSingle(),
    service
      .from('payment_intents')
      .select('id, order_id, razorpay_order_id, amount_minor, currency, status')
      .eq('id', payload.intentId)
      .maybeSingle(),
  ]);

  if (!order || !intent || intent.order_id !== order.id) {
    return (
      <Shell>
        <Message title="Order not found" />
      </Shell>
    );
  }
  if (PAID_OR_LATER.includes(order.status))
    redirect(paymentResultUrl(payload.r, order.id, 'success'));

  const stale =
    !check.ok ||
    order.status !== 'pending_payment' ||
    order.current_intent_id !== intent.id ||
    !['created', 'attempted'].includes(intent.status);
  if (stale) {
    return (
      <Shell>
        <Message title="This payment link expired">
          {payload.r === 'app' ? (
            <p>Go back to the app and tap Pay again.</p>
          ) : (
            <RetryCheckout orderId={order.id} />
          )}
        </Message>
      </Shell>
    );
  }

  const snapshot = (order.package_snapshot ?? {}) as { name?: string };
  const amount = formatMoney(intent.amount_minor, intent.currency as Currency);
  return (
    <Shell>
      <div className="flex flex-col gap-5 rounded-2xl border border-hairline bg-canvas p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow>
              Order <span className="text-ink">{order.order_number}</span>
            </Eyebrow>
            <span className="text-label-md text-ink">{snapshot.name ?? 'PR package'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-display text-headline-md text-ink">{amount}</span>
            <span className="font-mono text-code text-emerald-strong">All taxes included</span>
          </div>
        </div>
        <p className="rounded-xl border border-hairline bg-subtle p-3 text-body-sm text-body">
          {order.headline}
        </p>
      </div>
      <PayButton
        label={`Pay ${amount}`}
        options={{
          key: env.RAZORPAY_KEY_ID,
          amount: intent.amount_minor,
          currency: intent.currency,
          order_id: intent.razorpay_order_id,
          name: BRAND_NAME,
          description: order.order_number,
          prefill: {
            name: order.customer_name ?? '',
            email: order.customer_email ?? '',
            contact: order.customer_phone ?? '',
          },
          notes: { order_id: order.id, app: RAZORPAY_APP_TAG },
          callback_url: `${publicEnv().NEXT_PUBLIC_SITE_URL}/api/payments/callback?t=${encodeURIComponent(token)}`,
          redirect: true,
        }}
      />
      <p className="flex items-start gap-2 text-body-sm text-slate">
        <Icon name="shield" size={16} className="mt-0.5 text-emerald-strong" />
        Payments are processed securely by Razorpay. We never see your card or UPI details.
      </p>
    </Shell>
  );
}
