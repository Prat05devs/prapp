import Link from 'next/link';
import { JsonLd } from '@/components/site/json-ld';
import { SearchFaq } from '@/components/site/search-faq';
import { FACT_CHECK_QUESTIONS } from '@/lib/search-content';
import { pageMetadata, serviceSchema } from '@/lib/seo';
import { Page, PageHeader } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { historyFor } from '@/server/fact-checks';
import { getCurrentUser } from '@/server/session';
import { createServiceClient } from '@/server/supabase/service';
import { FactChecker } from './fact-checker';

export const metadata = pageMetadata(
  '/fact-check',
  'Free WhatsApp Fact Checker in India',
  'Check WhatsApp forwards, news links and screenshots in Hindi or English with NewsVio. Get an AI-assisted verdict with sources and clear limitations.',
);

export default async function FactCheckPage() {
  const me = await getCurrentUser().catch(() => null);
  const history = me ? await historyFor(createServiceClient(), me.id) : [];
  return (
    <Page width="md">
      <JsonLd
        data={serviceSchema(
          '/fact-check',
          'AI-assisted fact checking',
          'Check messages, news links and screenshots against public sources. Free within daily usage limits.',
        )}
      />
      <PageHeader
        eyebrow="Free fact check"
        title="Check WhatsApp forwards, news and screenshots"
        lede="Paste a message, a link or a screenshot. We check it against public sources."
      />
      <FactChecker
        siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
        signedIn={Boolean(me)}
        history={history}
      />
      <SearchFaq title="How to check a message before sharing" questions={FACT_CHECK_QUESTIONS} />
      <Link href="/methodology" className="text-label-md text-brand underline">
        Read our fact-checking methodology and corrections guidance
      </Link>
    </Page>
  );
}
