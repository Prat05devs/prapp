import { requireStaffPage } from '@/server/admin-session';
import { publicEnv } from '@/lib/env';
import { listIntegrations } from '@/server/integrations';
import { IntegrationsEditor } from './integrations-editor';

export const dynamic = 'force-dynamic';
export default async function IntegrationsPage() {
  await requireStaffPage('admin');
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-headline-md text-ink">Integrations</h1>
        <p className="mt-2 text-body-md text-slate">
          Manage payment and fact-check credentials. Only active admins can make changes.
        </p>
      </div>
      <IntegrationsEditor
        initial={await listIntegrations()}
        siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
      />
    </main>
  );
}
