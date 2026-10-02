import 'server-only';
import type { Json } from '@prapp/db-types';
import {
  LIMITS,
  type CheckoutResponse,
  type CheckoutReturn,
  type Currency,
  type PaymentsMode,
} from '@prapp/shared';
import { publicEnv } from '@/lib/env';
import { AppError, throwDbError } from '@/server/api';
import type { UserSupabase } from '@/server/auth';
import { signCheckoutToken } from '@/server/checkout-token';
import { razorpayEnv } from '@/server/env';
import { settleRazorpayOrder } from '@/server/payments';
import { loadMe } from '@/server/profile';
import { RAZORPAY_APP_TAG, type RazorpayGateway } from '@/server/razorpay';
import type { ServiceSupabase } from '@/server/service-types';

const PAYABLE = ['draft', 'pending_payment', 'expired'];
const ALREADY_PAID = ['paid', 'in_progress', 'changes_requested', 'published'];

export interface CheckoutDeps {
  user: { supabase: UserSupabase; userId: string };
  service: ServiceSupabase;
  /** Not needed (and not configured) in free mode. */
  gateway?: RazorpayGateway;
  /** Default 'razorpay'. */
  mode?: PaymentsMode;
  /** PAYMENTS_MODE=link: where the customer pays */
  paymentUrl?: string | null;
  now?: Date;
}

/** POST /api/orders/:id/checkout (LLD §9.4). */
export async function startCheckout(
  deps: CheckoutDeps,
  orderId: string,
  returnTo: CheckoutReturn,
): Promise<CheckoutResponse> {
  const { supabase, userId } = deps.user;
  const { service } = deps;
  const now = deps.now ?? new Date();

  // 1. Load as the user (RLS: only their own order).
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, package_id, declaration_accepted_at, current_intent_id, user_id',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!order || order.user_id !== userId) throw new AppError('order_not_found');
  if (ALREADY_PAID.includes(order.status)) throw new AppError('payment_already_made');
  if (!PAYABLE.includes(order.status)) throw new AppError('order_not_payable');

  // 2. Server-side validation.
  const me = await loadMe(supabase, userId);
  if (!me.profileComplete) throw new AppError('profile_incomplete');
  if (!order.declaration_accepted_at) throw new AppError('declaration_required');
  const { data: images, error: imagesError } = await supabase
    .from('order_images')
    .select('storage_path')
    .eq('order_id', orderId);
  if (imagesError) throwDbError(imagesError);
  if (!images?.length) throw new AppError('image_required');
  if (images.length > LIMITS.imagesMax) throw new AppError('too_many_images');
  const folder = `${userId}/${orderId}`;
  const listed = await service.storage.from('order-images').list(folder, { limit: 100 });
  if (listed.error) throw new AppError('internal_error');
  const stored = new Set((listed.data ?? []).map((o) => `${folder}/${o.name}`));
  if (!images.every((i) => stored.has(i.storage_path))) throw new AppError('image_required');

  // 3. Price comes from the DB, never from the client (golden rule 2).
  const { data: pkg, error: pkgError } = await service
    .from('packages')
    .select(
      'id, code, name, price_inr_paise, price_usd_cents, portal_count, includes_instagram, turnaround_hours, is_active',
    )
    .eq('id', order.package_id)
    .maybeSingle();
  if (pkgError) throwDbError(pkgError);
  if (!pkg?.is_active) throw new AppError('package_unavailable');
  const currency: Currency = 'INR'; // LLD §9.1: INR only in v1
  const amountMinor = pkg.price_inr_paise;
  const snapshot = {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    price_inr_paise: pkg.price_inr_paise,
    price_usd_cents: pkg.price_usd_cents,
    portal_count: pkg.portal_count,
    includes_instagram: pkg.includes_instagram,
    turnaround_hours: pkg.turnaround_hours,
  };

  // DECISION: testing phase (PAYMENTS_MODE=free): confirm at ₹0 instead of taking payment.
  // Same checks as above; the SQL applies the same "paid" effects as svc_apply_payment.
  if (deps.mode === 'free') {
    const { error: freeError } = await service.rpc('svc_confirm_free_order', {
      p_order_id: order.id,
      p_package_snapshot: snapshot as Json,
    });
    if (freeError) throwDbError(freeError);
    return { confirmed: true, amountMinor: 0, currency };
  }

  // DECISION: first build (PAYMENTS_MODE=link): confirm at the package price, flagged for an
  // admin to verify, and hand back the razorpay.me page where the customer pays.
  if (deps.mode === 'link') {
    if (!deps.paymentUrl) throw new AppError('internal_error');
    const { error: linkError } = await service.rpc('svc_confirm_link_order', {
      p_order_id: order.id,
      p_package_snapshot: snapshot as Json,
    });
    if (linkError) throwDbError(linkError);
    return { confirmed: true, amountMinor, currency, paymentUrl: deps.paymentUrl };
  }

  const gateway = deps.gateway;
  if (!gateway) throw new AppError('internal_error');

  // 4. Reuse the current intent (double tap, §9.10 row 1) or create a new one.
  let intent: { id: string; razorpay_order_id: string } | null = null;
  if (order.current_intent_id) {
    const { data: current } = await service
      .from('payment_intents')
      .select('id, razorpay_order_id, amount_minor, currency, status, livemode, created_at')
      .eq('id', order.current_intent_id)
      .maybeSingle();
    if (current) {
      const ageMs = now.getTime() - new Date(current.created_at).getTime();
      const reusable =
        order.status === 'pending_payment' &&
        current.amount_minor === amountMinor &&
        current.currency === currency &&
        current.livemode === gateway.livemode &&
        ['created', 'attempted'].includes(current.status) &&
        ageMs < LIMITS.intentReuseHours * 3600_000;
      if (reusable) {
        intent = current;
      } else {
        // Never abandon an intent that was actually paid (§9.10 rows 7, 11).
        const { moneyReceived } = await settleRazorpayOrder(
          service,
          gateway,
          current.razorpay_order_id,
        );
        if (moneyReceived) throw new AppError('payment_already_made');
      }
    }
  }

  if (!intent) {
    const rzpOrder = await gateway.createOrder({
      amount: amountMinor,
      currency,
      receipt: order.order_number,
      notes: { order_id: order.id, user_id: userId, app: RAZORPAY_APP_TAG },
    });
    const { data: created, error: intentError } = await service.rpc('svc_create_payment_intent', {
      p_order_id: order.id,
      p_razorpay_order_id: rzpOrder.id,
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_package_snapshot: snapshot as Json,
      p_livemode: gateway.livemode,
    });
    if (intentError) throwDbError(intentError);
    intent = { id: created.id, razorpay_order_id: created.razorpay_order_id };
  }

  // 5–6. Signed link to the hosted page.
  const token = signCheckoutToken(
    { orderId: order.id, intentId: intent.id, r: returnTo },
    razorpayEnv().CHECKOUT_TOKEN_SECRET,
    now.getTime(),
  );
  return {
    confirmed: false,
    checkoutUrl: `${publicEnv().NEXT_PUBLIC_SITE_URL}/pay/${token}`,
    razorpayOrderId: intent.razorpay_order_id,
    amountMinor,
    currency,
  };
}

/** POST /api/orders/:id/reopen (LLD §9.4): back to draft unless Razorpay already has money. */
export async function reopenOrder(
  deps: Omit<CheckoutDeps, 'now' | 'mode' | 'gateway'> & { gateway: RazorpayGateway },
  orderId: string,
): Promise<void> {
  const { supabase, userId } = deps.user;
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, user_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!order || order.user_id !== userId) throw new AppError('order_not_found');
  if (!['pending_payment', 'expired'].includes(order.status))
    throw new AppError('order_not_reopenable');

  const { data: intents } = await deps.service
    .from('payment_intents')
    .select('razorpay_order_id')
    .eq('order_id', orderId)
    .in('status', ['created', 'attempted']);
  for (const i of intents ?? []) {
    const { moneyReceived } = await settleRazorpayOrder(
      deps.service,
      deps.gateway,
      i.razorpay_order_id,
    );
    if (moneyReceived) throw new AppError('payment_already_made');
  }
  const { error: reopenError } = await deps.service.rpc('svc_reopen_order', {
    p_order_id: orderId,
  });
  if (reopenError) throwDbError(reopenError);
}
