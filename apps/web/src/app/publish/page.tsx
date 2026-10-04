import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { SearchFaq } from '@/components/site/search-faq';
import { PUBLISH_QUESTIONS } from '@/lib/search-content';
import { pageMetadata, serviceSchema } from '@/lib/seo';

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
  'Publish your announcements on news portals through NewsVio. Explore self-service PR packages with Instagram options, editorial review and live-link reports.',
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
          'Paid sponsored story publishing across our news portal network, with Instagram options according to the selected package and a delivery report with live links.',
        )}
      />
      <div className="flex flex-col gap-6 border-b border-hairline pb-8">
        <PageHeader
          eyebrow="Publish your story"
          title="Publish your story on news portals and Instagram"
          lede="Do your own PR with NewsVio. Submit your announcement for editorial review and sponsored publishing across our news portal network. Choose your package below for pricing, Instagram inclusion and turnaround."
        />
        <PublishSteps current={1} />
      </div>
      {portals.length ? (
        <details className="group rounded-2xl border border-hairline bg-subtle p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-label-md text-ink">
                Our publishing network: {portals.length} news portals
              </span>
              <span className="text-body-sm text-slate">
                Our team selects portals for your story according to your package. See the network.
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
        <Notice>No packages are available right now. Please check back soon.</Notice>
      )}
      <SearchFaq title="Questions about PR publishing in India" questions={PUBLISH_QUESTIONS} />
      <p className="text-body-sm text-body">
        Need help choosing a package?{' '}
        <Link href="/support" className="text-brand underline">
          Contact our publishing support team
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
