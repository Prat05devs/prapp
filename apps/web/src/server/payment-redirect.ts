import 'server-only';
import { APP_SCHEME, type CheckoutReturn, type PaymentResultStatus } from '@prapp/shared';
import { publicEnv } from '@/lib/env';

/** Where the customer lands after paying (LLD §9.5, §9.6 step 4). */
export function paymentResultUrl(
  r: CheckoutReturn,
  orderId: string,
  status: PaymentResultStatus,
  reason?: string | null,
): string {
  const params = new URLSearchParams({ status });
  if (reason) params.set('reason', reason.slice(0, 200));
  if (r === 'app') {
    params.set('order', orderId);
    return `${APP_SCHEME}://payment-result?${params.toString()}`;
  }
  const web = new URLSearchParams({ payment: status });
  if (reason) web.set('reason', reason.slice(0, 200));
  return `${publicEnv().NEXT_PUBLIC_SITE_URL}/orders/${orderId}?${web.toString()}`;
}
