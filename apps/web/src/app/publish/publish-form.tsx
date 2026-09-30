'use client';

import { useState } from 'react';
import type { CataloguePackage } from '@prapp/api-client';
import { FEATURE_CONSENT_TEXT, formatMoney, type OrderContentInput } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { PackagePicker } from '@/components/orders/package-picker';
import { StoryFields } from '@/components/orders/story-fields';
import { Button, Card, CheckRow, ErrorText, StepHeading } from '@/components/ui';
import { useCreateDraft } from '@/hooks/use-create-draft';

export function PublishForm({
  packages,
  initialPackageId,
}: {
  packages: CataloguePackage[];
  initialPackageId: string;
}) {
  const { pending, fieldErrors, error, create } = useCreateDraft();
  const [content, setContent] = useState<OrderContentInput>({
    packageId: initialPackageId,
    headline: '',
    body: '',
    instagramHandle: '',
    featureConsent: false,
    declarationAccepted: false,
  });
  const update = (patch: Partial<OrderContentInput>) => setContent((c) => ({ ...c, ...patch }));
  const selected = packages.find((p) => p.id === content.packageId);

  return (
    <form
      className="grid items-start gap-8 lg:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        void create(content);
      }}
    >
      <div className="flex flex-col gap-5 lg:col-span-7">
        <StepHeading step="01" title="Your story" />
        <Card>
          <StoryFields value={content} onChange={update} errors={fieldErrors} />
        </Card>
        <Card tone="subtle">
          <CheckRow
            checked={content.featureConsent ?? false}
            onChange={(featureConsent) => update({ featureConsent })}
          >
            {FEATURE_CONSENT_TEXT}
          </CheckRow>
        </Card>
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-span-5">
        <StepHeading step="02" title="Pick a package" aside="All taxes included" />
        <PackagePicker
          packages={packages}
          value={content.packageId}
          onChange={(packageId) => update({ packageId })}
          error={fieldErrors.packageId}
        />
        <Card tone="subtle" className="flex flex-col gap-4">
          <h3 className="text-label-md text-ink">Summary</h3>
          <dl className="flex flex-col gap-2 text-body-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Package</dt>
              <dd className="text-ink">{selected?.name ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-hairline pt-3">
              <dt className="text-label-md text-ink">Total</dt>
              <dd className="font-display text-headline-sm text-ink">
                {selected ? formatMoney(selected.priceInrPaise, 'INR') : '-'}
              </dd>
            </div>
          </dl>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" variant="accent" size="lg" disabled={pending}>
            Save and add images <Icon name="arrow_forward" />
          </Button>
          <p className="flex items-start gap-2 font-mono text-code text-slate">
            <Icon name="info" size={16} />
            You pay after adding photos and reviewing your story.
          </p>
        </Card>
      </div>
    </form>
  );
}
