'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Notice } from '@/components/ui';

const POLL_MS = 3000;
const POLL_FOR_MS = 60_000;

/**
 * Result of the hosted checkout (LLD §9.6). If Razorpay reported success but the order
 * is not paid yet (webhook/reconcile still pending, §9.10 rows 3–4), refresh for a minute.
 */
export function PaymentBanner({
  orderId,
  status,
  payment,
  reason,
  free = false,
}: {
  orderId: string;
  status: string;
  payment: string;
  reason: string | null;
  /** Confirmed at ₹0 (free checkout), so no payment was taken. */
  free?: boolean;
}) {
  const router = useRouter();
  const unpaid = status === 'pending_payment' || status === 'expired' || status === 'draft';
  const waiting = unpaid && (payment === 'success' || payment === 'pending');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const tick = setInterval(() => router.refresh(), POLL_MS);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setTimedOut(true);
    }, POLL_FOR_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [waiting, router, orderId]);

  if (!unpaid) {
    return (
      <Notice tone="success" title="Your story is with our editorial team.">
        {free
          ? 'We have received your submission.'
          : 'We have received your submission and payment.'}{' '}
        We will review the story before publication and notify you when the links are live.
      </Notice>
    );
  }
  if (payment === 'failed') {
    return (
      <Notice tone="danger" title="Payment was not completed">
        {reason ? `${reason}. ` : ''}No charge was confirmed. Try again or choose another payment
        method.
      </Notice>
    );
  }
  return (
    <div aria-live="polite">
      <Notice title={timedOut ? 'Still confirming your payment' : 'Confirming your payment…'}>
        {timedOut
          ? 'We are still confirming your payment with the bank. This page updates once it is confirmed. If money was taken, your order is safe.'
          : null}
      </Notice>
    </div>
  );
}
