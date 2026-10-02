'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi } from '@/lib/admin/api';

export function AttentionActions({
  orderId,
  reason,
  duplicate,
}: {
  orderId: string;
  reason: string | null;
  duplicate: { paymentId: string; amountMinor: number } | null;
}) {
  const action = useStaffAction();
  const [note, setNote] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {reason === 'duplicate_payment_refund_due' && duplicate ? (
          <Button
            disabled={action.pending !== null}
            onClick={() => {
              if (!confirm('Refund the extra payment in full?')) return;
              void action.run('dup', () =>
                adminApi.refund(orderId, {
                  paymentId: duplicate.paymentId,
                  amountMinor: duplicate.amountMinor,
                  reason: 'Duplicate payment refund',
                }),
              );
            }}
          >
            Refund duplicate
          </Button>
        ) : null}
        {reason === 'partial_delivery_refund_due' ? (
          <Link
            href={`/admin/orders/${orderId}`}
            className="text-sm font-medium text-emerald-strong hover:underline"
          >
            Partial refund from the order&apos;s payment panel
          </Link>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Input
          value={note}
          placeholder="Note (what was done)"
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          variant="outline"
          disabled={!note.trim() || action.pending !== null}
          onClick={() =>
            void action.run('clear', () =>
              adminApi.action('admin_clear_attention', {
                p_order_id: orderId,
                p_note: note,
              }),
            )
          }
        >
          Clear
        </Button>
      </div>
      <ErrorText>{action.error}</ErrorText>
    </div>
  );
}
