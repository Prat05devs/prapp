import type { Metadata } from 'next';
import { BRAND_NAME } from '@prapp/shared';
import { Page, PageHeader } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { historyFor } from '@/server/fact-checks';
import { getCurrentUser } from '@/server/session';
import { createServiceClient } from '@/server/supabase/service';
import { FactChecker } from './fact-checker';

export const metadata: Metadata = {
  title: `Fact check a forward · ${BRAND_NAME}`,
  description: 'Paste a message, a link or a screenshot. Free, with sources.',
};

export default async function FactCheckPage() {
  const me = await getCurrentUser().catch(() => null);
  const history = me ? await historyFor(createServiceClient(), me.id) : [];
  return (
    <Page width="md">
      <PageHeader
        eyebrow="Free fact check"
        title="Is this forward true?"
        lede="Paste a message, a link or a screenshot. We check it against public sources."
      />
      <FactChecker
        siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
        signedIn={Boolean(me)}
        history={history}
      />
    </Page>
  );
}
