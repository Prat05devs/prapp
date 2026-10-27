import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { SearchFaq } from '@/components/site/search-faq';
import { PUBLISH_QUESTIONS } from '@/lib/search-content';
import { pageMetadata, serviceSchema } from '@/lib/seo';
import { offerPrice } from '@prapp/shared';

import { fetchCatalogue } from '@prapp/api-client';
import { PublishSteps } from '@/components/orders/publish-steps';
import { PortalWall } from '@/components/site/portal-wall';
import { Notice, Page, PageHeader } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { getCurrentUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { PublishForm } from './publish-form';

export const metadata = pageMetadata(
  '/publish',
  'Self-Service PR & News Portal Publishing in India',
  'Your story, published without the agency process. Publish on news portals, Instagram and Facebook through NewsVio, with editorial review and a PDF report of every live link.',
);

// Open to guests: they can write the story and pick a package; saving asks them to log in
// (LLD §13, "When we ask for an account").
export default async function PublishPage({ searchParams }: PageProps<'/publish'>) {
  const me = await getCurrentUser().catch(() => null);
  const account = !me ? 'guest' : me.profileComplete ? 'ready' : 'incomplete';
  const params = await searchParams;
  const { packages, portals } = await fetchCatalogue(await createServerSupabase());
  const preselected = typeof params.package === 'string' ? params.package : undefined;
  const initialPackageId =
    packages.find((p) => p.code === preselected || p.id === preselected)?.id ??
    packages[0]?.id ??
    '';

  return (
    <Page width="xl">
      <JsonLd
        data={serviceSchema(
          '/publish',
          'Self-service PR publishing in India',
          'Sponsored story publishing across the NewsVio news and social network after editorial review, with a PDF delivery report of every live link.',
        )}
      />
      <div className="flex flex-col gap-6 border-b border-hairline pb-8">
        <PageHeader
          eyebrow="Do your own PR"
          title={
            packages[0]
              ? `Put your story in the news from ${offerPrice(packages[0])}.`
              : 'Put your story in the news.'
          }
          lede="Write your story, add 1–2 images and pay online. After editorial approval, we publish it and send you every live link."
        />
        <PublishSteps current={1} />
      </div>
      {portals.length ? (
        <details className="group rounded-2xl border border-hairline bg-subtle p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-label-md text-ink">
                One network. More places for your story: {portals.length} news portals
              </span>
              <span className="text-body-sm text-slate">
                Your package sets the number of placements; our team selects suitable available
                portals for your story.
              </span>
            </span>
            <span className="text-label-sm text-brand group-open:hidden">Show</span>
            <span className="hidden text-label-sm text-brand group-open:inline">Hide</span>
          </summary>
          <PortalWall
            className="pt-5"
            supabaseUrl={publicEnv().NEXT_PUBLIC_SUPABASE_URL}
            portals={portals.map((p) => ({
              name: p.name,
              domain: p.domain,
              homepageUrl: p.homepageUrl,
              logoPath: p.logoPath,
            }))}
          />
        </details>
      ) : null}
      {packages.length ? (
        <PublishForm
          packages={packages}
          initialPackageId={initialPackageId}
          account={account}
          resume={params.resume === '1'}
        />
      ) : (
        <Notice>
          No packages are available right now. Check back soon, or request a custom plan.
        </Notice>
      )}
      <SearchFaq title="Questions about PR publishing in India" questions={PUBLISH_QUESTIONS} />
      <p className="text-body-sm text-body">
        Need wider distribution?{' '}
        <Link href="/support" className="text-brand underline">
          Request a custom plan
        </Link>
        . Read the{' '}
        <Link href="/terms" className="text-brand underline">
          publishing terms
        </Link>{' '}
        before submitting.
      </p>
    </Page>
  );
}
