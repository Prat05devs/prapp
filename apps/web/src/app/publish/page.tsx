import { fetchCatalogue } from '@prapp/api-client';
import { PublishSteps } from '@/components/orders/publish-steps';
import { Notice, Page, PageHeader } from '@/components/ui';
import { requireCompleteUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { PublishForm } from './publish-form';

export default async function PublishPage({ searchParams }: PageProps<'/publish'>) {
  await requireCompleteUser('/publish');
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
          lede={`Our team posts it on our news portals and Instagram news page within 24 hours of payment.${
            portals.length ? ` Our portals: ${portals.map((p) => p.name).join(', ')}.` : ''
          }`}
        />
        <PublishSteps current={1} />
      </div>
      {packages.length ? (
        <PublishForm packages={packages} initialPackageId={initialPackageId} />
      ) : (
        <Notice>No packages are available right now. Please check back soon.</Notice>
      )}
    </Page>
  );
}
