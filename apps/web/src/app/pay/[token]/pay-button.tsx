'use client';

import Script from 'next/script';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { Button, ErrorText } from '@/components/ui';

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
  callback_url: string;
  redirect: true;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions & { theme?: { color: string } }) => {
      open: () => void;
    };
  }
}

/** Razorpay Standard Checkout; the result comes back via callback_url (LLD §9.5). */
export function PayButton({ label, options }: { label: string; options: RazorpayCheckoutOptions }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() =>
          setError('Could not load the payment form. Check your connection and reload.')
        }
      />
      <Button
        size="lg"
        variant="accent"
        disabled={!ready}
        onClick={() => {
          if (!window.Razorpay) return;
          new window.Razorpay({ ...options, theme: { color: '#006c49' } }).open();
        }}
      >
        {ready ? (
          <>
            {label} <Icon name="arrow_forward" />
          </>
        ) : (
          'Loading…'
        )}
      </Button>
      <ErrorText>{error}</ErrorText>
    </>
  );
}
