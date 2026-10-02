import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ApiError } from '@prapp/api-client';
import { APP_SCHEME } from '@prapp/shared';
import { api } from '@/lib/api';
import { registerForPush } from '@/lib/push';

/**
 * App payment (LLD §9.5): the hosted /pay page opens in an auth session; Razorpay's callback
 * redirects to newsvio://payment-result, which closes the browser. If the user closes it
 * manually the result is "unknown" and the order screen polls.
 */
export function useCheckout(orderId: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await api.orders.checkout(orderId, 'app');
      if (res.confirmed && res.paymentUrl) {
        // First build: the order is recorded; the customer pays on the razorpay.me page.
        void registerForPush().catch(() => {});
        await WebBrowser.openBrowserAsync(res.paymentUrl);
        router.replace({ pathname: '/orders/[id]', params: { id: orderId, payment: 'link' } });
        return;
      }
      if (res.confirmed) {
        // Free mode: already paid at ₹0, so skip the payment page.
        void registerForPush().catch(() => {});
        router.replace({ pathname: '/orders/[id]', params: { id: orderId, payment: 'success' } });
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(
        res.checkoutUrl,
        `${APP_SCHEME}://payment-result`,
      );
      let payment = 'pending';
      let reason: string | undefined;
      if (result.type === 'success') {
        const url = new URL(result.url);
        payment = url.searchParams.get('status') ?? 'pending';
        reason = url.searchParams.get('reason') ?? undefined;
      }
      if (payment === 'success') void registerForPush().catch(() => {});
      router.replace({
        pathname: '/orders/[id]',
        params: { id: orderId, payment, ...(reason ? { reason } : {}) },
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'payment_already_made') {
        router.replace({ pathname: '/orders/[id]', params: { id: orderId, payment: 'success' } });
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not start the payment.');
      }
    } finally {
      setPending(false);
    }
  }

  async function reopen() {
    setPending(true);
    setError(null);
    try {
      await api.orders.reopen(orderId);
      router.push({ pathname: '/orders/[id]/edit', params: { id: orderId } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reopen the order.');
    } finally {
      setPending(false);
    }
  }

  return { pending, error, pay, reopen };
}
