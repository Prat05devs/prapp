import { fetchCatalogue } from '@prapp/api-client';
import { PublishSteps } from '@/components/orders/publish-steps';
import { PortalWall } from '@/components/site/portal-wall';
import { Notice, Page, PageHeader } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { getCurrentUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { PublishForm } from './publish-form';

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
      <div className="flex flex-col gap-6 border-b border-hairline pb-8">
        <PageHeader
          eyebrow="Publish your story"
          title="Get your story published."
          lede="Our editorial team publishes it on 5 high-DA portals from our network, plus an Instagram collaboration post, within 24 hours of payment."
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
                Our team picks the best 5 for your story. Tap to see them all.
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
    </Page>
  );
}
