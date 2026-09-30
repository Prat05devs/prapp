'use client';

import Link from 'next/link';
import type { CataloguePackage, CustomerOrder } from '@prapp/api-client';
import { DECLARATION_TEXT, FEATURE_CONSENT_TEXT, formatMoney } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { ImageSlots } from '@/components/orders/image-slots';
import { PackagePicker } from '@/components/orders/package-picker';
import { PublishSteps } from '@/components/orders/publish-steps';
import { StatusBadge } from '@/components/orders/status-badge';
import { StoryFields } from '@/components/orders/story-fields';
import { Button, Card, CheckRow, ErrorText, Notice, StepHeading } from '@/components/ui';
import { useCheckout } from '@/hooks/use-checkout';
import { useOrderEditor, type SaveState } from '@/hooks/use-order-editor';

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  unsaved: 'Saving soon…',
  invalid: 'Not saved: fix the highlighted fields',
  error: 'Not saved',
};

export function OrderEditor({
  order,
  packages,
  userId,
  profileComplete,
  freeCheckout,
}: {
  order: CustomerOrder;
  packages: CataloguePackage[];
  userId: string;
  profileComplete: boolean;
  /** Testing phase: the order is confirmed at ₹0 instead of paid. */
  freeCheckout: boolean;
}) {
  const ed = useOrderEditor(order, userId, profileComplete);
  const checkout = useCheckout(order.id);
  const selected = packages.find((p) => p.id === ed.content.packageId);
  const isChangesRequested = ed.status === 'changes_requested';
  const saveOk = ed.saveState === 'saved';

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 border-b border-hairline pb-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 self-start text-label-sm text-slate hover:text-ink"
        >
          <Icon name="arrow_back" size={16} /> Orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-headline-md text-ink">{order.orderNumber}</h1>
            <StatusBadge status={ed.status} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-code uppercase ${
              saveOk
                ? 'text-emerald-strong'
                : ed.saveState === 'invalid' || ed.saveState === 'error'
                  ? 'text-danger'
                  : 'text-slate'
            }`}
            aria-live="polite"
          >
            {saveOk ? <Icon name="check_circle" size={14} /> : null}
            {SAVE_LABELS[ed.saveState]}
          </span>
        </div>
        {!isChangesRequested ? <PublishSteps current={ed.images.length ? 3 : 2} /> : null}
      </header>

      {isChangesRequested ? (
        <Notice tone="warn" title="Our team asked for changes">
          <p>{order.changesRequestedReason}</p>
        </Notice>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <StepHeading step="01" title="Your story" />
          <Card>
            <StoryFields value={ed.content} onChange={ed.update} errors={ed.fieldErrors} />
          </Card>
          <StepHeading step="02" title="Photos" />
          <ImageSlots
            images={ed.images}
            slots={ed.imageSlots}
            busy={ed.imageBusy}
            editable={ed.editable}
            onPick={(file, position) => void ed.addImage(file, position)}
            onRemove={(image) => void ed.removeImage(image)}
          />
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-span-5">
          <StepHeading
            step="03"
            title="Package"
            aside={ed.packageLocked ? 'Locked after payment' : 'All taxes included'}
          />
          <PackagePicker
            packages={packages}
            value={ed.content.packageId}
            onChange={(packageId) => ed.update({ packageId })}
            disabled={ed.packageLocked}
            error={ed.fieldErrors.packageId}
          />

          <Card tone="subtle" as="section" className="flex flex-col gap-4">
            <h2 className="text-label-md text-ink">Review</h2>
            <CheckRow
              checked={ed.content.featureConsent ?? false}
              onChange={(featureConsent) => ed.update({ featureConsent })}
            >
              {FEATURE_CONSENT_TEXT}
            </CheckRow>
            <CheckRow
              checked={ed.content.declarationAccepted ?? false}
              onChange={(declarationAccepted) => ed.update({ declarationAccepted })}
            >
              {DECLARATION_TEXT} <span className="text-danger">*</span>
            </CheckRow>
            {ed.readiness.problems.length ? (
              <ul className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-canvas p-3">
                {ed.readiness.problems.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-body-sm text-body">
                    <Icon name="info" size={16} className="mt-0.5 text-warn" />
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            {!isChangesRequested && selected ? (
              <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
                <span className="text-label-md text-ink">Total</span>
                {freeCheckout ? (
                  <span className="flex items-baseline gap-2">
                    <s className="text-body-sm text-slate">
                      {formatMoney(selected.priceInrPaise, 'INR')}
                    </s>
                    <span className="font-display text-headline-sm text-ink">
                      {formatMoney(0, 'INR')}
                    </span>
                  </span>
                ) : (
                  <span className="font-display text-headline-sm text-ink">
                    {formatMoney(selected.priceInrPaise, 'INR')}
                  </span>
                )}
              </div>
            ) : null}
            <ErrorText>{ed.error ?? checkout.error}</ErrorText>
            {isChangesRequested ? (
              <Button
                size="lg"
                variant="accent"
                disabled={!ed.readiness.ready || ed.busy || ed.saveState === 'saving'}
                onClick={() => void ed.resubmit()}
              >
                Resubmit for publishing <Icon name="arrow_forward" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="accent"
                disabled={
                  !ed.readiness.ready ||
                  checkout.pending ||
                  ed.saveState === 'saving' ||
                  ed.saveState === 'unsaved'
                }
                onClick={() => void checkout.pay()}
              >
                {freeCheckout ? (
                  <>
                    Confirm order <Icon name="arrow_forward" />
                  </>
                ) : (
                  <>
                    <Icon name="lock" />
                    {selected ? `Pay ${formatMoney(selected.priceInrPaise, 'INR')}` : 'Pay'}
                  </>
                )}
              </Button>
            )}
            {ed.status === 'draft' ? (
              <Button
                variant="destructive-outline"
                disabled={ed.busy}
                onClick={() => void ed.discardDraft()}
              >
                <Icon name="delete" /> Discard draft
              </Button>
            ) : null}
            {!isChangesRequested ? (
              <p className="flex items-start gap-2 font-mono text-code text-slate">
                <Icon name="shield" size={16} />
                Paid securely with Razorpay: UPI, card or net banking.
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
