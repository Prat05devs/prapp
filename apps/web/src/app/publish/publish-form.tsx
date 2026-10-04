'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CataloguePackage } from '@prapp/api-client';
import { FEATURE_CONSENT_TEXT, formatMoney, type OrderContentInput } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { PackagePicker } from '@/components/orders/package-picker';
import { StoryFields } from '@/components/orders/story-fields';
import { Button, Card, CheckRow, ErrorText, StepHeading } from '@/components/ui';
import { useCreateDraft } from '@/hooks/use-create-draft';

// What a guest typed, kept across the log-in round trip (login may open in a new tab from the
// email link, so localStorage rather than sessionStorage). Cleared as soon as it's read.
const DRAFT_KEY = 'newsvio.publish-draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function keepDraft(content: OrderContentInput) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), content }));
  } catch {
    // storage blocked (private mode): they'll retype after logging in
  }
}

function takeDraft(): OrderContentInput | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { savedAt: number; content: OrderContentInput };
    return Date.now() - saved.savedAt < DRAFT_MAX_AGE_MS ? saved.content : null;
  } catch {
    return null;
  }
}

/**
 * Guests fill in everything; "Save and add images" needs an account, so that's where we ask
 * them to log in (and add name + phone if missing). The story comes back with them and, with
 * `resume`, the save carries on by itself.
 */
export function PublishForm({
  packages,
  initialPackageId,
  account,
  resume,
}: {
  packages: CataloguePackage[];
  initialPackageId: string;
  account: 'guest' | 'incomplete' | 'ready';
  resume: boolean;
}) {
  const router = useRouter();
  const { pending, fieldErrors, error, validate, create } = useCreateDraft();
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

  // Back from logging in: restore the story, and continue the save if we were asked to.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = takeDraft();
    if (!draft) return;
    const packageId = packages.some((p) => p.id === draft.packageId)
      ? draft.packageId
      : initialPackageId;
    const next = { ...draft, packageId };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage after login
    setContent(next);
    if (resume && account === 'ready') void create(next);
  }, [account, create, initialPackageId, packages, resume]);

  function submit() {
    if (account === 'ready') return void create(content);
    if (!validate(content)) return;
    keepDraft(content);
    const back = encodeURIComponent('/publish?resume=1');
    router.push(
      account === 'guest' ? `/login?reason=publish&next=${back}` : `/complete-profile?next=${back}`,
    );
  }

  return (
    <form
      className="grid items-start gap-8 lg:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-5 lg:col-span-7">
        <StepHeading title="Your story" />
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
        <StepHeading title="Pick a package" aside="All taxes included" />
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
          <p className="flex items-start gap-2 text-body-sm text-slate">
            <Icon name="info" size={16} />
            {account === 'guest'
              ? "Next you'll log in or create an account, then add photos and pay."
              : 'You pay after adding photos and reviewing your story.'}
          </p>
        </Card>
      </div>
    </form>
  );
}
