'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@prapp/api-client';
import { api } from '@/lib/api';

/** Web: start/reuse the payment, then open the hosted /pay page in this tab (LLD §9.5). */
export function useCheckout(orderId: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await api.orders.checkout(orderId, 'web');
      if (res.confirmed) {
        // Free mode: already paid at ₹0, so skip /pay and show the success state.
        router.replace(`/orders/${orderId}?payment=success`);
        router.refresh();
        return;
      }
      window.location.assign(res.checkoutUrl);
    } catch (e) {
      setPending(false);
      if (e instanceof ApiError && e.code === 'payment_already_made') {
        router.replace(`/orders/${orderId}?payment=success`);
        router.refresh();
        return;
      }
      if (e instanceof ApiError && e.code === 'profile_incomplete') {
        router.push(`/complete-profile?next=${encodeURIComponent(`/orders/${orderId}/edit`)}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Could not start the payment.');
    }
  }

  /** pending_payment/expired → draft, after the server checks Razorpay (LLD §9.4). */
  async function reopen() {
    setPending(true);
    setError(null);
    try {
      await api.orders.reopen(orderId);
      router.push(`/orders/${orderId}/edit`);
      router.refresh();
    } catch (e) {
      setPending(false);
      if (e instanceof ApiError && e.code === 'payment_already_made') {
        router.refresh();
      }
      setError(e instanceof ApiError ? e.message : 'Could not reopen the order.');
    }
  }

  return { pending, error, pay, reopen };
}
