'use client';

import { Button, ErrorText } from '@/components/ui';
import { useCheckout } from '@/hooks/use-checkout';

/** §9.10 row 26: an expired link offers a fresh checkout. */
export function RetryCheckout({ orderId }: { orderId: string }) {
  const { pending, error, pay } = useCheckout(orderId);
  return (
    <>
      <Button variant="accent" size="lg" onClick={() => void pay()} disabled={pending}>
        Pay again
      </Button>
      <ErrorText>{error}</ErrorText>
    </>
  );
}
