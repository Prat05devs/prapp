'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import { Button, ErrorText, Notice, buttonVariants } from '@/components/ui';
import { useCheckout } from '@/hooks/use-checkout';

export function OrderActions({
  orderId,
  status,
  reportStatus,
  hasReport,
}: {
  orderId: string;
  status: string;
  reportStatus: string;
  hasReport: boolean;
}) {
  const checkout = useCheckout(orderId);
  return (
    <div className="flex flex-col gap-3">
      {status === 'draft' || status === 'changes_requested' ? (
        <Link href={`/orders/${orderId}/edit`} className={buttonVariants({ size: 'lg' })}>
          <Icon name="edit" /> {status === 'draft' ? 'Continue editing' : 'Edit and resubmit'}
        </Link>
      ) : null}
      {status === 'pending_payment' || status === 'expired' ? (
        <>
          <Button
            size="lg"
            variant="accent"
            onClick={() => void checkout.pay()}
            disabled={checkout.pending}
          >
            <Icon name="lock" /> Pay now
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => void checkout.reopen()}
            disabled={checkout.pending}
          >
            <Icon name="edit" /> Edit story
          </Button>
        </>
      ) : null}
      {status === 'published' && hasReport ? (
        <a href={`/api/orders/${orderId}/report`} className={buttonVariants({ size: 'lg' })}>
          <Icon name="download" /> Download report (PDF)
        </a>
      ) : null}
      {status === 'published' && !hasReport && reportStatus !== 'ready' ? (
        <Notice>Your report is being prepared. We&apos;ll notify you when it&apos;s ready.</Notice>
      ) : null}
      <ErrorText>{checkout.error}</ErrorText>
    </div>
  );
}
